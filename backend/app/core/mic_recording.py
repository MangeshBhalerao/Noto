import sounddevice as sd
import soundfile as sf
import numpy as np

SAMPLE_RATE = 22050  # Hz (standard for music analysis)

def record_audio(duration=10, output_file="recorded_clip.wav"):
    """
    Record audio from microphone
    
    Args:
        duration: seconds to record
        output_file: where to save the recording
        
    Returns:
        path to saved file
    """
    print(f"🎤 Recording for {duration} seconds...")
    print("Start playing your song NOW!")
    
    # Record audio
    recording = sd.rec(
        int(duration * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,  # Mono
        dtype='float32'
    )
    
    # Wait until recording is finished
    sd.wait()
    
    print("✅ Recording finished!")
    
    # Save to file
    sf.write(output_file, recording, SAMPLE_RATE)
    print(f"💾 Saved to {output_file}")
    
    return output_file