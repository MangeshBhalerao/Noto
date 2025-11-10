from .core.audio_processing import build_peak_database
from pathlib import Path

# === Paths ===
BASE_DIR = Path(__file__).resolve().parent.parent.parent
songs_folder = str(BASE_DIR / "data" / "songs")
peak_db_file = str(BASE_DIR / "data" / "fingerprints" / "peak_db.json")

print("🎵 PEAK-BASED FINGERPRINT DATABASE BUILDER")
print("=" * 60)
print(f"Songs folder: {songs_folder}")
print(f"Output: {peak_db_file}")
print("=" * 60)

# Build the database
build_peak_database(songs_folder, peak_db_file)

print("\n✅ Done! Database is ready for matching.")
