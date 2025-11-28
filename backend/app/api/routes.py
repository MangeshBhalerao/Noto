from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil
from ..core.audio_processing import match_song
from ..schemas.song import SongResponse, RecognitionResponse

router = APIRouter()

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
PEAK_DB_FILE = BASE_DIR / "data" / "fingerprints" / "peak_db.json"
TEMP_DIR = BASE_DIR / "data" / "temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/test")
async def test():
    return {"message": "Routes working!", "status": "ok"}


@router.post("/recognize", response_model=RecognitionResponse)
async def recognize_audio(file: UploadFile = File(...)):
    """
    Main feature: Recognize a song from audio recording
    
    User sends: 10-second audio clip (WAV/MP3)
    We return: Matched song + confidence
    """
    
    try:
        # 1. Save uploaded file temporarily
        temp_file_path = TEMP_DIR / f"recording_{file.filename}"
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"✅ Saved recording to: {temp_file_path}")
        
        # 2. Match against database
        print("🔍 Matching audio...")
        matched_song, matches, confidence = match_song(
            str(PEAK_DB_FILE),
            str(temp_file_path)
        )
        
        # 3. Clean up temp file
        temp_file_path.unlink()
        
        # 4. Check if match found
        if matched_song and matches > 20:  # Need at least 20 matches
            # Extract song info from filename
            song_info = SongResponse(
                title=matched_song.replace(".mp3", "").replace(".wav", ""),
                artist="Unknown",  # You can parse from filename
                file_name=matched_song
            )
            
            return RecognitionResponse(
                matched=True,
                song=song_info,
                confidence=confidence,
                aligned_matches=matches,
                message=f"Match found with {confidence:.1f}% confidence!"
            )
        else:
            # No match
            return RecognitionResponse(
                matched=False,
                song=None,
                confidence=0.0,
                aligned_matches=matches if matched_song else 0,
                message="No match found. Song not in database."
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Recognition failed: {str(e)}"
        )