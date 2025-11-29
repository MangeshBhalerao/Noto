'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Footer from '../components/Footer';

export default function TestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(12);
  const audioContextRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);

  const startRecording = async () => {
    try {
      setError(null);
      setResult(null);
      setIsAnalyzing(false);
      setCountdown(12);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 44100,  // Higher quality
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      streamRef.current = stream;
      
      // Use Web Audio API to record as WAV
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 44100  // Higher quality recording
      });
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      audioChunksRef.current = [];
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(inputData));
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
      recorderRef.current = { source, processor };
      setIsRecording(true);
      console.log('Recording started (WAV format)...');
      
      // Countdown timer (12 seconds for better accuracy)
      let timeLeft = 12;
      timerRef.current = setInterval(() => {
        timeLeft--;
        setCountdown(timeLeft);
        console.log('Countdown:', timeLeft);
        
        if (timeLeft <= 0) {
          clearInterval(timerRef.current);
          console.log('Timer finished, stopping recording...');
          stopRecording();
        }
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please allow microphone permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsRecording(false);
    setIsAnalyzing(true);
    
    // Disconnect audio nodes
    if (recorderRef.current) {
      recorderRef.current.processor.disconnect();
      recorderRef.current.source.disconnect();
    }
    
    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Convert Float32Array chunks to WAV
    console.log('Converting to WAV...');
    const wavBlob = await createWavBlob(audioChunksRef.current, 44100);  // Use 44100 Hz
    console.log('WAV blob created:', wavBlob.size, 'bytes');
    
    if (wavBlob.size > 0) {
      await sendToBackend(wavBlob);
    } else {
      setError('No audio recorded. Please try again.');
      setIsAnalyzing(false);
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const createWavBlob = async (audioChunks, sampleRate) => {
    // Merge all chunks
    let totalLength = 0;
    audioChunks.forEach(chunk => totalLength += chunk.length);
    
    const mergedData = new Float32Array(totalLength);
    let offset = 0;
    audioChunks.forEach(chunk => {
      mergedData.set(chunk, offset);
      offset += chunk.length;
    });
    
    // Convert Float32 to Int16 (WAV format)
    const int16Data = new Int16Array(mergedData.length);
    for (let i = 0; i < mergedData.length; i++) {
      const s = Math.max(-1, Math.min(1, mergedData[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Create WAV header
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    // WAV file header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + int16Data.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, int16Data.length * 2, true);
    
    // Combine header and audio data
    const wavBlob = new Blob([wavHeader, int16Data], { type: 'audio/wav' });
    return wavBlob;
  };

  const sendToBackend = async (audioBlob) => {
    try {
      console.log('Sending WAV to backend...', audioBlob.size, 'bytes');
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');
      
      // Send to backend
      console.log('POST to http://localhost:8000/api/recognize');
      const response = await fetch('http://localhost:8000/api/recognize', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Recognition failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Recognition result:', data);
      setResult(data);
      setIsAnalyzing(false);
      
    } catch (err) {
      console.error('Error sending to backend:', err);
      setError(`Failed to recognize song: ${err.message}. Make sure backend is running on port 8000.`);
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0a1214 0%, #101d22 50%, #0f1a1e 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(54, 195, 242, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        animation: 'pulse 4s ease-in-out infinite',
        pointerEvents: 'none',
      }}></div>

      {/* Header/Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(16, 29, 34, 0.8)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
             onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
            <div style={{
              width: '28px',
              height: '28px',
              color: '#36c3f2',
            }}>
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" fill="currentColor" fillRule="evenodd"/>
              </svg>
            </div>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'white',
              margin: 0,
            }}>Noto</h2>
          </Link>
          
          <Link href="/" style={{
            color: 'rgba(255, 255, 255, 0.7)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'color 0.2s',
          }} onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
             onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'clamp(2rem, 5vw, 4rem) 1.5rem',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          maxWidth: '900px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'clamp(2rem, 5vw, 4rem)',
        }}>
          
          {/* Hero Section */}
          <section style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '2rem',
            width: '100%',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <h1 style={{
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: '1.2',
                margin: 0,
              }}>
                Identify Music Instantly
              </h1>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
                lineHeight: '1.6',
                maxWidth: '600px',
                margin: '0 auto',
              }}>
                Tap to record 12 seconds and discover what's playing
              </p>
            </div>

            {/* Recording Button */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 'clamp(240px, 50vw, 320px)',
              height: 'clamp(240px, 50vw, 320px)',
            }}>
              {/* Animated Rings */}
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  position: 'absolute',
                  inset: `${i * 8}px`,
                  borderRadius: '50%',
                  border: `1px solid rgba(54, 195, 242, ${0.3 - i * 0.1})`,
                  animation: isRecording ? `pulse ${2 + i * 0.5}s ease-in-out infinite` : 'none',
                  animationDelay: `${i * 0.2}s`,
                }}></div>
              ))}
              
              <div style={{
                position: 'absolute',
                inset: '2rem',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(54, 195, 242, 0.15) 0%, transparent 70%)',
              }}></div>
              
              {/* Main Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isRecording || isAnalyzing}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  height: 'clamp(80px, 20vw, 100px)',
                  width: 'clamp(80px, 20vw, 100px)',
                  padding: '0 2rem',
                  backgroundColor: (isRecording || isAnalyzing) ? 'rgba(54, 195, 242, 0.5)' : '#36c3f2',
                  color: '#FFFFFF',
                  fontSize: '1 rem',
                  fontWeight: '800',
                  border: 'none',
                  cursor: (isRecording || isAnalyzing) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: (isRecording || isAnalyzing) ? 'none' : '0 0 40px rgba(54, 195, 242, 0.4)',
                }}
                onMouseEnter={(e) => {
                  if (!isRecording && !isAnalyzing) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 0 50px rgba(54, 195, 242, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isRecording && !isAnalyzing) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(54, 195, 242, 0.4)';
                  }
                }}
              >
                {isRecording ? countdown : isAnalyzing ? '...' : 'IDENTIFY'}
              </button>
            </div>

            {/* Status Messages */}
            {isRecording && (
              <div style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(54, 195, 242, 0.1)',
                border: '1px solid rgba(54, 195, 242, 0.3)',
                borderRadius: '9999px',
                color: '#36c3f2',
                fontSize: '1rem',
                fontWeight: '500',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
                🎤 Listening... {countdown}s remaining
              </div>
            )}

            {isAnalyzing && !isRecording && (
              <div style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(54, 195, 242, 0.1)',
                border: '1px solid rgba(54, 195, 242, 0.3)',
                borderRadius: '9999px',
                color: '#36c3f2',
                fontSize: '1rem',
                fontWeight: '500',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
                🔍 Analyzing audio...
              </div>
            )}

            {error && (
              <div style={{
                padding: '1rem 1.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '1rem',
                maxWidth: '500px',
              }}>
                <p style={{
                  color: 'rgba(239, 68, 68, 0.9)',
                  fontSize: '0.875rem',
                  margin: 0,
                }}>{error}</p>
              </div>
            )}
          </section>

          {/* Result Card */}
          {result && (
            <div style={{
              width: '100%',
              maxWidth: '600px',
              animation: 'fadeInUp 0.5s ease-out',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                padding: '2rem',
                borderRadius: '1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              }}>
                {result.matched ? (
                  <>
                    {/* Success Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      paddingBottom: '1rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    }}>
                      <div style={{
                        padding: '0.5rem',
                        background: 'rgba(34, 197, 94, 0.2)',
                        borderRadius: '0.5rem',
                      }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16.667 5L7.5 14.167L3.333 10" stroke="rgb(34, 197, 94)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span style={{
                        color: '#36c3f2',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                      }}>
                        {result.confidence.toFixed(1)}% Match
                      </span>
                    </div>

                    {/* Song Info */}
                    <div>
                      <h2 style={{
                        color: 'white',
                        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                        fontWeight: '700',
                        margin: '0 0 0.5rem 0',
                        lineHeight: '1.2',
                      }}>
                        {result.song.title}
                      </h2>
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '1.125rem',
                        margin: '0 0 1rem 0',
                      }}>
                        {result.song.artist}
                      </p>
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontSize: '0.875rem',
                        margin: 0,
                      }}>
                        {result.aligned_matches} matching fingerprints
                      </p>
                    </div>

                    {/* Success Message */}
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                      borderRadius: '0.75rem',
                    }}>
                      <p style={{
                        color: 'rgba(34, 197, 94, 0.9)',
                        fontSize: '0.875rem',
                        margin: 0,
                      }}>
                        ✓ {result.message}
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem 1rem',
                  }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      margin: '0 auto 1.5rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="rgba(239, 68, 68, 0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '1.125rem',
                      fontWeight: '500',
                      margin: '0 0 0.5rem 0',
                    }}>
                      {result.message}
                    </p>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.875rem',
                      margin: 0,
                    }}>
                      Try recording closer to the audio source or with less background noise.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions (show when idle) */}
          {!isRecording && !isAnalyzing && !result && (
            <div style={{
              maxWidth: '500px',
              padding: '2rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <h3 style={{
                color: 'white',
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '1rem',
                textAlign: 'center',
              }}>How it works</h3>
              <ol style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem',
                lineHeight: '1.8',
                paddingLeft: '1.25rem',
                margin: 0,
              }}>
                <li style={{ marginBottom: '0.5rem' }}>Click the button to start recording</li>
                <li style={{ marginBottom: '0.5rem' }}>Allow microphone access when prompted</li>
                <li style={{ marginBottom: '0.5rem' }}>Play a song or hum a melody (12 seconds)</li>
                <li>Wait for AI to identify the track</li>
              </ol>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
