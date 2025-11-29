import os
import json
import psycopg2
from psycopg2.extras import execute_batch
from .core.audio_processing import fingerprint_song
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SONGS_DIR = Path(__file__).parent.parent.parent / "data" / "songs"


def create_tables(conn):
    """Create songs and fingerprints tables with indexes"""
    with conn.cursor() as cur:
        # Create songs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS songs (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                artist TEXT,
                album TEXT,
                duration FLOAT,
                file_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create fingerprints table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS fingerprints (
                id SERIAL PRIMARY KEY,
                song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
                hash TEXT NOT NULL,
                time_offset INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create index on hash for fast lookups
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_fingerprints_hash 
            ON fingerprints(hash);
        """)
        
        # Create composite index for hash + time
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_fingerprints_hash_time 
            ON fingerprints(hash, time_offset);
        """)
        
        conn.commit()
        print("✅ Tables and indexes created successfully")


def migrate_from_json(conn):
    """Migrate existing peak_db.json to Postgres"""
    json_path = Path(__file__).parent.parent.parent / "data" / "fingerprints" / "peak_db.json"
    
    if not json_path.exists():
        print("⚠️  peak_db.json not found, will build from scratch")
        return
    
    print(f"📂 Loading JSON from {json_path}")
    with open(json_path, 'r') as f:
        peak_db = json.load(f)
    
    # peak_db structure: {hash_string: [{song, offset}, {song, offset}]}
    # We need to reorganize by song first
    
    print("🔄 Reorganizing data by song...")
    songs_set = set()
    
    # Collect all unique songs
    for entries in peak_db.values():
        for entry in entries:
            songs_set.add(entry['song'])
    
    print(f"📊 Found {len(songs_set)} unique songs")
    
    with conn.cursor() as cur:
        # Insert songs
        song_map = {}  # {song_name: song_id}
        
        for idx, song_name in enumerate(sorted(songs_set), 1):
            # Clean song name (remove .mp3 extension for title)
            clean_name = song_name.replace('.mp3', '').replace('.wav', '')
            
            cur.execute("""
                INSERT INTO songs (title, file_path)
                VALUES (%s, %s)
                RETURNING id;
            """, (clean_name, f"data/songs/{song_name}"))
            
            song_id = cur.fetchone()[0]
            song_map[song_name] = song_id
            print(f"[{idx}/{len(songs_set)}] ✅ Inserted song: {clean_name} (ID: {song_id})")
        
        # Insert fingerprints in batches
        fingerprints_batch = []
        
        for hash_string, entries in peak_db.items():
            for entry in entries:
                song_name = entry['song']
                offset = entry['offset']
                song_id = song_map[song_name]
                
                fingerprints_batch.append((song_id, hash_string, offset))
        
        print(f"📊 Inserting {len(fingerprints_batch):,} fingerprints...")
        
        execute_batch(cur, """
            INSERT INTO fingerprints (song_id, hash, time_offset)
            VALUES (%s, %s, %s);
        """, fingerprints_batch, page_size=1000)
        
        conn.commit()
        print(f"✅ Migration complete! {len(fingerprints_batch):,} fingerprints inserted")


def build_from_songs(conn):
    """Build database from MP3 files in data/songs/"""
    if not SONGS_DIR.exists():
        print(f"❌ Songs directory not found: {SONGS_DIR}")
        return
    
    mp3_files = list(SONGS_DIR.glob("*.mp3"))
    
    if not mp3_files:
        print(f"⚠️  No MP3 files found in {SONGS_DIR}")
        return
    
    print(f"🎵 Found {len(mp3_files)} songs to process")
    
    with conn.cursor() as cur:
        for idx, mp3_path in enumerate(mp3_files, 1):
            song_name = mp3_path.stem
            print(f"[{idx}/{len(mp3_files)}] Processing: {song_name}")
            
            # Extract fingerprints
            hashes = fingerprint_song(str(mp3_path))
            
            # Insert song
            cur.execute("""
                INSERT INTO songs (title, file_path)
                VALUES (%s, %s)
                RETURNING id;
            """, (song_name, str(mp3_path.relative_to(SONGS_DIR.parent.parent))))
            
            song_id = cur.fetchone()[0]
            
            # Insert fingerprints
            fingerprints_batch = []
            for hash_value, time_offsets in hashes.items():
                for offset in time_offsets:
                    fingerprints_batch.append((song_id, hash_value, offset))
            
            execute_batch(cur, """
                INSERT INTO fingerprints (song_id, hash, time_offset)
                VALUES (%s, %s, %s);
            """, fingerprints_batch, page_size=1000)
            
            print(f"  ✅ Inserted {len(fingerprints_batch):,} fingerprints")
        
        conn.commit()
        print(f"🎉 Database built successfully from {len(mp3_files)} songs!")


def main():
    """Main migration function"""
    if not DATABASE_URL:
        print("❌ DATABASE_URL not found in environment variables")
        print("   Create a .env file with: DATABASE_URL=postgresql://...")
        return
    
    print("🔗 Connecting to Neon Postgres...")
    conn = psycopg2.connect(DATABASE_URL)
    
    try:
        # Step 1: Create tables
        create_tables(conn)
        
        # Step 2: Check if we should migrate or build fresh
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM songs;")
            song_count = cur.fetchone()[0]
        
        if song_count > 0:
            print(f"⚠️  Database already has {song_count} songs. Skipping migration.")
        else:
            # Try migration from JSON first
            json_path = Path(__file__).parent.parent.parent / "data" / "fingerprints" / "peak_db.json"
            
            if json_path.exists():
                print("📦 Migrating from peak_db.json...")
                migrate_from_json(conn)
            else:
                print("🔨 Building database from MP3 files...")
                build_from_songs(conn)
        
        # Show statistics
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM songs;")
            total_songs = cur.fetchone()[0]
            
            cur.execute("SELECT COUNT(*) FROM fingerprints;")
            total_fingerprints = cur.fetchone()[0]
        
        print("\n" + "="*50)
        print(f"📊 Database Statistics:")
        print(f"   Songs: {total_songs:,}")
        print(f"   Fingerprints: {total_fingerprints:,}")
        print("="*50)
        
    finally:
        conn.close()


if __name__ == "__main__":
    main()
