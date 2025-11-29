"""
Database connection and query utilities for Postgres
"""
import os
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from collections import Counter
from typing import Dict, List, Tuple, Optional

# Database connection pool
_pool = None


def get_db_pool():
    """Get or create database connection pool"""
    global _pool
    
    if _pool is None:
        DATABASE_URL = os.getenv("DATABASE_URL")
        if not DATABASE_URL:
            raise Exception("DATABASE_URL environment variable not set")
        
        _pool = SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=DATABASE_URL
        )
    
    return _pool


def get_db_connection():
    """Get a connection from the pool"""
    pool = get_db_pool()
    return pool.getconn()


def release_db_connection(conn):
    """Release connection back to pool"""
    pool = get_db_pool()
    pool.putconn(conn)


def query_fingerprints(sample_hashes: Dict[str, List[int]]) -> Dict[str, List[int]]:
    """
    Query database for matching fingerprints
    
    Args:
        sample_hashes: Dict of {hash_string: [time_offsets]}
        
    Returns:
        Dict of {song_title: [time_deltas]} for alignment matching
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # Get all hash strings from sample
            hash_list = list(sample_hashes.keys())
            
            if not hash_list:
                return {}
            
            # Query all matching fingerprints with song info
            # Use IN clause for batch lookup
            cur.execute("""
                SELECT 
                    s.title,
                    f.hash,
                    f.time_offset
                FROM fingerprints f
                JOIN songs s ON f.song_id = s.id
                WHERE f.hash = ANY(%s);
            """, (hash_list,))
            
            results = cur.fetchall()
            
            # Build matches dict
            matches = {}  # song_title -> [time_deltas]
            
            for song_title, hash_string, db_offset in results:
                # Get sample offsets for this hash
                sample_offsets = sample_hashes.get(hash_string, [])
                
                for sample_offset in sample_offsets:
                    # Calculate time delta (alignment)
                    time_delta = db_offset - sample_offset
                    
                    if song_title not in matches:
                        matches[song_title] = []
                    
                    matches[song_title].append(time_delta)
            
            return matches
            
    finally:
        release_db_connection(conn)


def get_song_by_title(title: str) -> Optional[Dict]:
    """Get song information by title"""
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, title, artist, album, duration, file_path
                FROM songs
                WHERE title = %s
                LIMIT 1;
            """, (title,))
            
            row = cur.fetchone()
            
            if row:
                return {
                    "id": row[0],
                    "title": row[1],
                    "artist": row[2] or "Unknown",
                    "album": row[3],
                    "duration": row[4],
                    "file_path": row[5]
                }
            
            return None
            
    finally:
        release_db_connection(conn)


def match_song_postgres(sample_hashes: Dict[str, List[int]]) -> Tuple[Optional[str], int, float]:
    """
    Match a sample against Postgres database
    
    Args:
        sample_hashes: Dict of {hash_string: [time_offsets]} from sample
        
    Returns:
        (song_title, aligned_matches, confidence)
    """
    # Query database for matches
    matches = query_fingerprints(sample_hashes)
    
    if not matches:
        return None, 0, 0.0
    
    # Count aligned matches per song
    song_scores = {}
    
    for song_title, time_deltas in matches.items():
        # Count total matches
        match_count = len(time_deltas)
        
        # Find most common time delta (indicates alignment)
        if time_deltas:
            most_common_delta = Counter(time_deltas).most_common(1)[0]
            aligned_matches = most_common_delta[1]
        else:
            aligned_matches = 0
        
        song_scores[song_title] = {
            "total_matches": match_count,
            "aligned_matches": aligned_matches
        }
        
        print(f"{song_title:50} | Matches: {match_count:4} | Aligned: {aligned_matches:4}")
    
    # Find best match
    if song_scores:
        best_match = max(song_scores.items(), key=lambda x: x[1]["aligned_matches"])
        song_title = best_match[0]
        aligned = best_match[1]["aligned_matches"]
        
        # Calculate confidence
        confidence = min(100, (aligned / 10) * 100) if aligned > 0 else 0
        
        return song_title, aligned, confidence
    
    return None, 0, 0.0


def close_db_pool():
    """Close all database connections"""
    global _pool
    
    if _pool:
        _pool.closeall()
        _pool = None
