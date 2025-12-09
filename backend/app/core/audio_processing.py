import librosa
import numpy as np
import json
import os
from scipy.ndimage import maximum_filter
import hashlib

# === Configuration ===
SAMPLE_RATE = 22050
WINDOW_SIZE = 4096
HOP_LENGTH = 512
PEAK_NEIGHBORHOOD_SIZE = 20  # Optimal for peak detection
MIN_HASH_TIME_DELTA = 0
MAX_HASH_TIME_DELTA = 200
FINGERPRINT_REDUCTION = 15  # Keep top 15% of peaks
PEAK_SORT = True
FAN_VALUE = 10  # Each peak pairs with next 10 peaks



def load_audio(file_path: str):
    
    print("Loading audio...")
    audio_data, sr = librosa.load(file_path, sr=SAMPLE_RATE, mono=True)
    return audio_data, sr

def generate_spectrogram(audio_data, sr):
    
    print("Generating spectrogram...")
    
    # Compute Short-Time Fourier Transform (STFT)
    stft = librosa.stft(audio_data, n_fft=WINDOW_SIZE, hop_length=HOP_LENGTH)
    
    # Convert to magnitude (absolute value)
    spectrogram = np.abs(stft)
    
    return spectrogram

def find_peaks(spectrogram):
    
    print(f"  Finding peaks...")
    
    # Use simpler peak detection to avoid memory issues
    # Apply maximum filter to find local maxima
    struct = np.ones((PEAK_NEIGHBORHOOD_SIZE, PEAK_NEIGHBORHOOD_SIZE))
    local_max = maximum_filter(spectrogram, footprint=struct) == spectrogram
    
    # Apply threshold to keep only significant peaks
    threshold = np.percentile(spectrogram, 75)
    detected_peaks = local_max & (spectrogram > threshold)
    
    # Extract peak coordinates
    amps = spectrogram[detected_peaks]
    freqs, times = np.where(detected_peaks)
    
    # Further filter by amplitude (keep top percentile)
    if len(amps) > 0:
        amps_threshold = np.percentile(amps, 100 - FINGERPRINT_REDUCTION)
        
        # Get peaks above threshold
        peaks = []
        for amp, freq, time in zip(amps, freqs, times):
            if amp >= amps_threshold:
                peaks.append((freq, time))
    else:
        peaks = []
    
    print(f"  Found {len(peaks)} peaks")
    return peaks

def generate_hashes(peaks, song_id=None):
    print(f"  Generating hashes...")
    
    # Sort peaks by time
    if PEAK_SORT:
        peaks = sorted(peaks, key=lambda x: x[1])
    
    hashes = []
    
    # For each peak (anchor point)
    for i in range(len(peaks)):
        freq1, time1 = peaks[i]
        
        # Look at next FAN_VALUE peaks only (reduces combinations dramatically!)
        for j in range(i + 1, min(i + 1 + FAN_VALUE, len(peaks))):
            freq2, time2 = peaks[j]
            
            # Calculate time difference
            time_diff = time2 - time1
            
            # Only pair peaks within time window
            if time_diff > MAX_HASH_TIME_DELTA:
                break
            
            if time_diff >= MIN_HASH_TIME_DELTA:
                # Create hash from: freq1, freq2, time_diff
                # This combination is unique to this song!
                hash_string = f"{freq1}|{freq2}|{time_diff}"
                
                # Store hash with time offset (where in song this pattern occurs)
                hashes.append((hash_string, time1))
    
    print(f"  Generated {len(hashes)} hashes")
    return hashes

def fingerprint_song(file_path):
    # Load audio
    audio, sr = load_audio(file_path)
    
    # Generate spectrogram
    spec = generate_spectrogram(audio, sr)
    
    # Find peaks
    peaks = find_peaks(spec)
    
    # Generate hashes
    hashes = generate_hashes(peaks)
    
    return hashes



def match_song(database_path: str, sample_path: str):
    
    print("\n🔍 Analyzing sample...")
    
    # Load database
    with open(database_path, 'r') as f:
        database = json.load(f)
    
    # Generate hashes from sample
    print("\n📊 Extracting fingerprint from sample...")
    sample_hashes = fingerprint_song(sample_path)
    
    # Match hashes
    print(f"\n🔎 Searching database for matches...")
    matches = {}  # song -> [time_deltas]
    
    for hash_string, sample_offset in sample_hashes:
        if hash_string in database:
            # This hash exists in database!
            for entry in database[hash_string]:
                song = entry["song"]
                db_offset = entry["offset"]
                
                # Calculate time delta (alignment)
                time_delta = db_offset - sample_offset
                
                if song not in matches:
                    matches[song] = []
                
                matches[song].append(time_delta)
    
    # Count matches per song
    print(f"\n📈 Match Results:")
    print("-" * 60)
    
    song_scores = {}
    for song, time_deltas in matches.items():
        # Count how many hashes matched
        match_count = len(time_deltas)
        
        # Find most common time delta (indicates alignment)
        if time_deltas:
            from collections import Counter
            most_common_delta = Counter(time_deltas).most_common(1)[0]
            aligned_matches = most_common_delta[1]
        else:
            aligned_matches = 0
        
        song_scores[song] = {
            "total_matches": match_count,
            "aligned_matches": aligned_matches
        }
        
        print(f"{song:50} | Matches: {match_count:4} | Aligned: {aligned_matches:4}")
    
    # Find best match
    if song_scores:
        best_match = max(song_scores.items(), key=lambda x: x[1]["aligned_matches"])
        song_name = best_match[0]
        aligned = best_match[1]["aligned_matches"]
        total = best_match[1]["total_matches"]
        
        # Calculate confidence (rough estimate)
        confidence = min(100, (aligned / 10) * 100) if aligned > 0 else 0
        
        return song_name, aligned, confidence
    else:
        return None, 0, 0

