from .core.mic_recording import record_audio
from .core.audio_processing import extract_fingerprint
from scipy.spatial.distance import euclidean
from pathlib import Path
import json

# === Setup ===
BASE_DIR = Path(__file__).resolve().parent.parent.parent
fingerprint_file = BASE_DIR / "data" / "fingerprints" / "db.json"
recording_path = BASE_DIR / "data" / "recorded_clip.wav"

print("=" * 60)
print("🎵 MUSIC RECOGNITION FROM MICROPHONE")
print("=" * 60)

# === Step 1: Record from mic ===
print("\n📋 Instructions:")
print("1. Play one of your songs on your computer/phone")
print("2. Hold it near the microphone")
print("3. Recording will start in 3 seconds...\n")

input("Press ENTER when ready...")

# Record 10 seconds
recorded_file = record_audio(duration=10, output_file=str(recording_path))

# === Step 2: Extract fingerprint from recording ===
print("\n🔍 Analyzing recording...")
test_fp = extract_fingerprint(recorded_file)

# === Step 3: Load database ===
with open(fingerprint_file) as f:
    fingerprints = json.load(f)

# === Step 4: Find best match ===
print("\n📊 Comparing with database:")
print("-" * 60)

best_match, best_score = None, float("inf")

for song, fp in fingerprints.items():
    dist = euclidean(fp, test_fp)
    print(f"{song}: {dist:.2f}")
    if dist < best_score:
        best_score = dist
        best_match = song

print("=" * 60)
print(f"\n🎧 Best Match: {best_match}")
print(f"📏 Distance: {best_score:.2f}")
print("=" * 60)

# Confidence indicator
if best_score < 20:
    print("✅ High confidence match!")
elif best_score < 50:
    print("⚠️  Moderate confidence - might be correct")
else:
    print("❌ Low confidence - probably not a match")