Noto – Audio Matching & Song Guessing System

Noto is an end-to-end audio-matching system that identifies songs by generating spectral fingerprints and comparing them against a Postgres database.


                                    📌 Key Features

- Converts audio into spectrogram peak fingerprints

- Stores fingerprints efficiently in Postgres

- Matches user-recorded audio against database hashes

- Returns best-aligned match with confidence score

- Fully deployed: Vercel (frontend) + Render (backend) + Neon Postgres

_______________________________________________________________________________________________                            
                            🧠 System Workflow (Clear & Simple)
________________________________________________________________________________________________
- Load song → create spectrogram → detect peaks → pair peaks into hashes → store hashes in Postgres → user records audio → generate hashes → compare with database → align matches → return best-matching song.


________________________________________________________________________________________________
                            ⚠️ Challenges & Professional Solutions
________________________________________________________________________________________________
1. Large JSON File → Migrated to Postgres

Original dataset: 490MB JSON with millions of fingerprints.
Solved by migrating to Postgres and structuring data efficiently.

2. Git Repository Cleanup
Removed large audio files, cleaned repo history, and updated .gitignore for a maintainable codebase.

3. Handling Free-Tier Database Limits
Neon free tier provides 512MB storage.
Optimized fingerprints and reduced dataset to 10 high-quality songs (~50MB total DB size).

4. Data Normalization & Schema Design
Reorganized fingerprint data to a consistent structure per song, improving insert logic and query reliability.

5. Backend Deployment Configuration
Configured explicit Uvicorn start commands on Render for stable FastAPI deployment.

6. Recording + Threshold Optimization
Increased recording duration to 12s and tuned matching thresholds for more stable recognition.



                                Achieved full deployment:
_______________________________________________________________________________________________
-Frontend: Vercel

-Backend: Render

-Database: Neon Postgres

System now consistently identifies songs with aligned match scoring.
________________________________________________________________________________________________
                                📊 Final Stats
________________________________________________________________________________________________
Songs: 10
Total Fingerprints: 403,240
DB Size: ~390MB
Recognition Time:
    - Free tier: 2–3 minutes
    -Optimized hardware: ~10–20 seconds

Status: Fully operational, production-ready with upgrades
________________________________________________________________________________________________
                                🌱 Future Improvements
________________________________________________________________________________________________
- Add DB indexes for faster hash lookups

- Expand dataset to full library (108 songs)

- Implement Redis caching

- Upgrade to higher CPU tier for real-time matching

- Add user accounts & search history

- Add waveform/spectrogram visualization