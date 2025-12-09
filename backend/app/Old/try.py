from .core.audio_processing import build_fingerprint_database, extract_fingerprint
from scipy.spatial.distance import euclidean
import json
import os
from pathlib import Path

# paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
songs_folder = str(BASE_DIR / "data" / "songs")
fingerprint_file = str(BASE_DIR / "data" / "fingerprints" / "db.json")
test_path = str(BASE_DIR / "data" / "songs" / "Kanye West - Can't Tell Me Nothing.mp3")
os.makedirs(os.path.dirname(fingerprint_file), exist_ok=True)

# fingerprint database
print("Building fingerprint database...")
build_fingerprint_database(songs_folder, fingerprint_file)

# === Step 2: Test with a single clip ===
test_fp = extract_fingerprint(test_path)

# === Step 3: Compare with stored fingerprints ===
with open(fingerprint_file) as f:
    fingerprints = json.load(f)

best_match, best_score = None, float("inf")

for song, fp in fingerprints.items():
    dist = euclidean(fp, test_fp)
    print(f"{song}: {dist}")
    if dist < best_score:
        best_score = dist
        best_match = song

print(f"\n🎧 Best Match: {best_match} (Distance: {best_score:.2f})")
