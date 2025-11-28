from pydantic import BaseModel
from typing import Optional

# 1. For returning song info
class SongResponse(BaseModel):
    """When showing song details"""
    title: str
    artist: str
    album: Optional[str] = None
    duration: Optional[float] = None
    file_name: str  # Original filename

# 2. For recognition results
class RecognitionResponse(BaseModel):
    """Response from /api/recognize"""
    matched: bool
    song: Optional[SongResponse] = None
    confidence: float
    aligned_matches: int
    message: str