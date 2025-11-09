import librosa
import numpy as np
import json
import os

def extract_fingerprint(file_path: str):
    """Extract MFCC mean fingerprint from an audio file."""
    y, sr = librosa.load(file_path)
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    fingerprint = np.mean(mfccs, axis=1)
    return fingerprint.tolist()

def build_fingerprint_database(songs_folder: str, save_path: str):
    """Loop through all .mp3 or .wav files and build fingerprint database."""
    fingerprints = {}
    for file in os.listdir(songs_folder):
        if file.endswith((".wav", ".mp3")):
            full_path = os.path.join(songs_folder, file)
            print(f"Processing {file}...")
            fingerprints[file] = extract_fingerprint(full_path)

    with open(save_path, "w") as f:
        json.dump(fingerprints, f)
    print(f"✅ Fingerprints saved at {save_path}")
