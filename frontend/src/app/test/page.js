'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

export default function TestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(10);
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
      setCountdown(10);
      
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
      
      // Countdown timer (10 seconds)
      let timeLeft = 10;
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
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#101d22] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 text-[#36c3f2]">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_6_330)">
                <path clipRule="evenodd" d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" fill="currentColor" fillRule="evenodd"></path>
              </g>
              <defs>
                <clipPath id="clip0_6_330"><rect fill="white" height="48" width="48"></rect></clipPath>
              </defs>
            </svg>
          </div>
          <h2 className="text-xl font-bold">Noto</h2>
        </div>
        <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
          ← Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="flex flex-col items-center w-full max-w-4xl gap-16">
          
          {/* Hero Section */}
          <section className="flex flex-col items-center text-center gap-8 w-full">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
                The future of music recognition.
              </h1>
              <p className="text-white/70 text-base sm:text-lg font-normal max-w-2xl">
                Tap the scanner to identify any sound around you with the power of AI.
              </p>
            </div>

            {/* Recording Button */}
            <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80">
              {/* Animated rings */}
              <div className={`absolute inset-0 rounded-full border border-[#36c3f2]/20 ${isRecording ? 'animate-pulse' : ''}`}></div>
              <div className={`absolute inset-2 rounded-full border border-[#36c3f2]/30 ${isRecording ? 'animate-pulse' : ''}`} style={{ animationDelay: '0.2s' }}></div>
              <div className="absolute inset-4 rounded-full bg-[#36c3f2]/10"></div>
              
              {/* Main Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isRecording || isAnalyzing}
                className={`relative flex items-center justify-center rounded-full h-20 sm:h-24 px-8 bg-[#36c3f2] text-[#101d22] text-base sm:text-lg font-bold transition-all duration-300 transform ${
                  (isRecording || isAnalyzing) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-[0_0_15px_2px_rgba(54,195,242,0.5)]'
                }`}
              >
                {isRecording ? `Recording... ${countdown}s` : isAnalyzing ? 'Analyzing...' : 'Tap to Identify'}
              </button>
            </div>

            {/* Status Messages */}
            {isRecording && (
              <p className="text-[#36c3f2] text-lg animate-pulse">
                🎤 Listening... {countdown} second{countdown !== 1 ? 's' : ''} remaining
              </p>
            )}

            {isAnalyzing && !isRecording && (
              <p className="text-[#36c3f2] text-lg animate-pulse">
                🔍 Analyzing audio...
              </p>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 max-w-md">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </section>

          {/* Result Card */}
          {result && (
            <div className="w-full max-w-lg">
              <div className="flex flex-col gap-6 p-6 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                {result.matched ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-[#36c3f2] text-sm font-medium">
                          {result.confidence.toFixed(1)}% Match
                        </p>
                        <p className="text-white text-2xl font-bold mt-1">
                          {result.song.title}
                        </p>
                        <p className="text-white/70 text-base">
                          {result.song.artist}
                        </p>
                        <p className="text-white/50 text-sm mt-2">
                          {result.aligned_matches} matching fingerprints
                        </p>
                      </div>
                    </div>
                    <p className="text-[#36c3f2] text-sm">
                      ✓ {result.message}
                    </p>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-white/70 text-lg">
                      {result.message}
                    </p>
                    <p className="text-white/50 text-sm mt-2">
                      Try recording closer to the audio source or with less background noise.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          {!isRecording && !result && (
            <div className="flex flex-col gap-4 text-center max-w-md">
              <h3 className="text-xl font-bold text-white">How it works:</h3>
              <ol className="text-left text-white/70 space-y-2">
                <li>1. Click "Tap to Identify" button</li>
                <li>2. Allow microphone access when prompted</li>
                <li>3. Play a song or hum a melody (10 seconds)</li>
                <li>4. Wait for AI to identify the song</li>
              </ol>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
