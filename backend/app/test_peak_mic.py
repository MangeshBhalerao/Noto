from .core.mic_recording import record_audio
from .core.audio_processing import match_song
from pathlib import Path

# === Setup ===
BASE_DIR = Path(__file__).resolve().parent.parent.parent
peak_db_file = BASE_DIR / "data" / "fingerprints" / "peak_db.json"
recording_path = BASE_DIR / "data" / "recorded_clip.wav"

print("=" * 60)
print("🎵 PEAK-BASED MUSIC RECOGNITION FROM MICROPHONE")
print("=" * 60)

# Check if database exists
if not peak_db_file.exists():
    print("\n❌ ERROR: Peak database not found!")
    print(f"   Please run: python -m backend.app.build_peak_db")
    exit(1)

# === Step 1: Record from mic ===
print("\n📋 Instructions:")
print("1. Play one of your songs on your computer/phone")
print("2. Hold it near the microphone")
print("3. Try to minimize background noise")
print()

input("Press ENTER when ready to record...")

# Record 10 seconds
print()
recorded_file = record_audio(duration=10, output_file=str(recording_path))

# === Step 2: Match against database ===
best_match, match_count, confidence = match_song(str(peak_db_file), recorded_file)

# === Step 3: Show results ===
print("\n" + "=" * 60)
if best_match:
    print(f"🎧 Best Match: {best_match}")
    print(f"📊 Aligned Matches: {match_count}")
    print(f"🎯 Confidence: {confidence:.1f}%")
    print("=" * 60)
    
    if confidence > 70:
        print("✅ High confidence - Very likely correct!")
    elif confidence > 40:
        print("⚠️  Moderate confidence - Probably correct")
    else:
        print("❌ Low confidence - Might not be accurate")
else:
    print("❌ No match found!")
    print("=" * 60)
    print("\nTips:")
    print("- Make sure the song is in your database")
    print("- Try playing the song louder")
    print("- Reduce background noise")
    print("- Record for longer (edit mic_recording.py)")
