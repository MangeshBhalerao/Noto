from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil
import os
from ..core.audio_processing import fingerprint_song
from ..core.database import match_song_postgres, get_song_by_title
from ..schemas.song import SongResponse, RecognitionResponse

router = APIRouter()

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
TEMP_DIR = BASE_DIR / "data" / "temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Check if using Postgres or JSON fallback
USE_POSTGRES = os.getenv("DATABASE_URL") is not None
PEAK_DB_FILE = BASE_DIR / "data" / "fingerprints" / "peak_db.json"

if USE_POSTGRES:
    print("🐘 Using Postgres database")
else:
    print("📄 Using JSON database (fallback)")
    from ..core.audio_processing import match_song

@router.get("/test")
async def test():
    return {"message": "Routes working!", "status": "ok"}


@router.post("/recognize", response_model=RecognitionResponse)
async def recognize_audio(file: UploadFile = File(...)):
    """
    Main feature: Recognize a song from audio recording
    
    User sends: 10-second audio clip (WAV format from browser)
    We return: Matched song + confidence
    """
    
    temp_file_path = None
    
    try:
        # 1. Save uploaded WAV file temporarily
        temp_file_path = TEMP_DIR / f"recording_{file.filename}"
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"✅ Saved recording to: {temp_file_path}")
        print(f"📊 File size: {temp_file_path.stat().st_size} bytes")
        
        # 2. Match against database
        print("🔍 Matching audio against database...")
        
        if USE_POSTGRES:
            # Extract fingerprints from sample
            print("📊 Extracting fingerprint from sample...")
            sample_hashes = fingerprint_song(str(temp_file_path))
            
            # Match using Postgres
            matched_song, matches, confidence = match_song_postgres(sample_hashes)
        else:
            # Fallback to JSON
            matched_song, matches, confidence = match_song(
                str(PEAK_DB_FILE),
                str(temp_file_path)
            )
        
        # 3. Clean up temp file (commented for debugging)
        # if temp_file_path and temp_file_path.exists():
        #     temp_file_path.unlink()
        #     print("🗑️ Cleaned up temp file")
        print(f"💾 Recording saved at: {temp_file_path}")
        
        # 4. Check if match found
        if matched_song and matches >= 15:  # Need at least 15 aligned matches (lowered threshold)
            # Get song info from database if using Postgres
            if USE_POSTGRES:
                song_data = get_song_by_title(matched_song)
                song_info = SongResponse(
                    title=song_data["title"] if song_data else matched_song,
                    artist=song_data["artist"] if song_data else "Unknown",
                    file_name=matched_song
                )
            else:
                # Extract song info from filename (JSON fallback)
                song_info = SongResponse(
                    title=matched_song.replace(".mp3", "").replace(".wav", ""),
                    artist="Unknown",
                    file_name=matched_song
                )
            
            print(f"✅ Match found: {matched_song} ({confidence:.1f}% confidence)")
            
            return RecognitionResponse(
                matched=True,
                song=song_info,
                confidence=confidence,
                aligned_matches=matches,
                message=f"Match found with {confidence:.1f}% confidence!"
            )
        else:
            # No match
            print(f"❌ No match found (aligned matches: {matches})")
            return RecognitionResponse(
                matched=False,
                song=None,
                confidence=0.0,
                aligned_matches=matches if matched_song else 0,
                message="Unable to recognize. Song not in database or audio quality too low."
            )
            
    except Exception as e:
        # Clean up on error
        if temp_file_path and temp_file_path.exists():
            temp_file_path.unlink()
            
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500,
            detail=f"Recognition failed: {str(e)}"
        )