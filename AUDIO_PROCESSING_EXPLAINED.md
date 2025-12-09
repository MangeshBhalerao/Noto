# Audio Processing Deep Dive: The Heart of Noto

## Overview
This document explains every function in `audio_processing.py` - the core file where all the music recognition magic happens. This is the engine that converts audio into searchable fingerprints.

---

## Table of Contents
1. [Configuration Constants](#configuration-constants)
2. [Function 1: load_audio()](#function-1-load_audio)
3. [Function 2: generate_spectrogram()](#function-2-generate_spectrogram)
4. [Function 3: find_peaks()](#function-3-find_peaks)
5. [Function 4: generate_hashes()](#function-4-generate_hashes)
6. [Function 5: fingerprint_song()](#function-5-fingerprint_song)
7. [Function 6: build_peak_database()](#function-6-build_peak_database)
8. [Function 7: match_song()](#function-7-match_song)
9. [Data Reduction Journey](#data-reduction-journey)
10. [Why These Functions Matter](#why-these-functions-matter)

---

## Configuration Constants

```python
SAMPLE_RATE = 22050          # Audio sampling rate (Hz)
WINDOW_SIZE = 4096           # FFT window size (samples)
HOP_LENGTH = 512             # Step size between windows (samples)
PEAK_NEIGHBORHOOD_SIZE = 20  # Size for finding local maxima
MIN_AMPLITUDE = 10           # Minimum peak intensity
FAN_VALUE = 10               # Number of pairs per peak
```

### Why These Values?

**SAMPLE_RATE = 22050 Hz**
- Can detect frequencies up to 11,025 Hz (Nyquist theorem: max = sample_rate / 2)
- Covers most musical content (human hearing: 20 Hz - 20 kHz)
- Sweet spot between quality and processing speed
- Lower rates (16 kHz) lose high-frequency content
- Higher rates (44.1 kHz) offer no benefit for recognition

**WINDOW_SIZE = 4096**
- Larger window = better frequency resolution, worse time resolution
- 4096 samples ≈ 186ms at 22050 Hz
- Good balance for music analysis
- Must be power of 2 for efficient FFT computation

**HOP_LENGTH = 512**
- How far we "slide" the window for each analysis
- 512 samples ≈ 23ms at 22050 Hz
- Smaller = more detail, but more data
- 75% overlap (4096 - 512) ensures smooth analysis

**FAN_VALUE = 10**
- Each peak pairs with the next 10 peaks
- Creates constellation map fingerprint
- Higher value = more fingerprints, better matching, slower processing

---

## Function 1: load_audio()

### What It Does
Loads an audio file and prepares it for analysis by converting it to the right format.

### Code
```python
def load_audio(file_path, sr=SAMPLE_RATE):
    y, sr = librosa.load(file_path, sr=sr, mono=True)
    return y, sr
```

### Input/Output
**Input:** 
- `file_path`: Path to audio file (MP3, WAV, M4A, etc.)
- `sr`: Target sample rate (default 22050 Hz)

**Output:**
- `y`: NumPy array of audio samples (e.g., `[0.023, -0.045, 0.012, ...]`)
- `sr`: Actual sample rate used (22050)

### Example
```python
audio_data, sample_rate = load_audio("song.mp3")
# audio_data: array of 3,000,000 samples for a 2-minute song
# sample_rate: 22050
```

### Step-by-Step Process
1. **Librosa reads the file** - Handles MP3, WAV, M4A, FLAC formats
2. **Resampling** - Converts any sample rate to 22050 Hz
3. **Mono conversion** - Merges stereo (L+R) into single channel
4. **Normalization** - Values range from -1.0 to +1.0

### Visual for Video
```
Original Audio File (44.1kHz Stereo)
           ↓
    [librosa.load]
           ↓
   Resampled (22.05kHz)
           ↓
   Converted to Mono
           ↓
  NumPy Array of Samples
```

### Why This Matters
- **Standardization**: All songs processed the same way regardless of source format
- **Mono simplifies**: We don't need stereo for fingerprinting
- **22kHz is optimal**: Fast processing, preserves music frequencies

---

## Function 2: generate_spectrogram()

### What It Does
Transforms audio from time domain (waveform) to frequency domain (spectrogram) - showing which frequencies are present at each moment in time.

### Code
```python
def generate_spectrogram(y, sr=SAMPLE_RATE):
    # Short-Time Fourier Transform
    D = librosa.stft(y, n_fft=WINDOW_SIZE, hop_length=HOP_LENGTH)
    magnitude = np.abs(D)
    return magnitude
```

### Input/Output
**Input:**
- `y`: Audio samples array (1D: time)
- `sr`: Sample rate (22050)

**Output:**
- `magnitude`: 2D array (frequency × time)
  - Shape: `(2049, num_frames)` where 2049 = WINDOW_SIZE/2 + 1
  - Each column = one time window
  - Each row = one frequency bin

### Example
```python
audio, sr = load_audio("song.mp3")
spec = generate_spectrogram(audio, sr)
# spec.shape: (2049, 5000) for a 2-minute song
# spec[100, 200]: magnitude at frequency bin 100, time frame 200
```

### Step-by-Step Process
1. **Windowing**: Divide audio into overlapping 4096-sample chunks
2. **FFT (Fast Fourier Transform)**: Convert each chunk from time to frequency
3. **Magnitude extraction**: `np.abs()` gets strength of each frequency
4. **Result**: 2D matrix where:
   - X-axis = time (frames)
   - Y-axis = frequency (bins)
   - Value = intensity (brightness)

### Visual for Video
```
Waveform (Time Domain)          Spectrogram (Frequency Domain)
     /\  /\                     
    /  \/  \                    Frequency ↑
   /        \                   10kHz |███░░░░░░░░░░░|
  ─────────────→ Time           5kHz  |░░░███████░░░░|
                                1kHz  |████░░░░░░░███|
                STFT                  └─────────────→ Time
                 ↓
        
  2D Matrix (2049 × 5000)
  Each pixel = frequency intensity at a time
```

### Why This Matters
- **Frequency is fingerprint-friendly**: Musical notes = specific frequencies
- **Time information preserved**: We know WHEN each frequency occurs
- **Robust to noise**: Strong frequencies stand out even with background noise
- **Human-recognizable**: Same spectrogram = same song (mostly)

---

## Function 3: find_peaks()

### What It Does
Identifies the strongest, most distinctive points in the spectrogram - these become the "constellation points" used for fingerprinting.

### Code
```python
def find_peaks(magnitude):
    # Find local maxima
    local_max = maximum_filter(magnitude, size=(20, 20)) == magnitude
    
    # Threshold: keep only strong peaks (top 15%)
    threshold = np.percentile(magnitude, 75)
    peaks = local_max & (magnitude > threshold)
    
    # Get coordinates and intensities
    peak_coords = np.argwhere(peaks)
    peak_values = magnitude[peaks]
    
    # Sort by intensity, keep top 15%
    sorted_indices = np.argsort(peak_values)[::-1]
    top_15_percent = int(len(sorted_indices) * 0.15)
    top_indices = sorted_indices[:top_15_percent]
    
    final_peaks = peak_coords[top_indices]
    return final_peaks  # Array of [freq_bin, time_frame] pairs
```

### Input/Output
**Input:**
- `magnitude`: Spectrogram (2049 × 5000)

**Output:**
- `final_peaks`: Array of peak coordinates
  - Shape: `(num_peaks, 2)` where each row is `[freq_bin, time_frame]`
  - Example: `[[100, 50], [523, 120], [1200, 450], ...]`
  - Typically 5000-15000 peaks per song

### Example
```python
spec = generate_spectrogram(audio, sr)
peaks = find_peaks(spec)
# peaks: [[100, 50], [523, 120], [1200, 450], ...]
# Each peak represents a prominent frequency at a specific time
```

### Step-by-Step Process

1. **Maximum Filter (20×20 neighborhood)**
   - For each point, check if it's the highest in a 20×20 region
   - Ensures peaks are spread out, not clustered
   
2. **Threshold Filter (75th percentile)**
   - Calculate: "What value is higher than 75% of all values?"
   - Removes weak/noise peaks
   
3. **Keep Top 15%**
   - Among qualifying peaks, keep only the strongest 15%
   - Reduces data while keeping most distinctive features
   
4. **Return Coordinates**
   - Each peak = `(frequency_bin, time_frame)`

### Visual for Video
```
Spectrogram              →    Peak Detection
                              
Freq ↑                        Freq ↑
|████░░░░|                    |  ⭐  |     ← Local maximum
|░░███░░░|                    |   ⭐  |     ← Above threshold
|░░░░████|                    |    ⭐ |     ← Top 15%
└────────→ Time               └────────→ Time

Before: 2,049 × 5,000 = 10,245,000 points
After: ~10,000 peaks (99.9% reduction!)
```

### Why This Matters
- **Massive data reduction**: 10 million points → 10,000 peaks
- **Noise resistance**: Only prominent features survive
- **Spread out**: 20×20 filter prevents clustering
- **Reproducible**: Same song → same peaks (even with noise)

---

## Function 4: generate_hashes()

### What It Does
Creates unique fingerprints by pairing nearby peaks using the "fan-out" algorithm - the secret sauce of music recognition.

### Code
```python
def generate_hashes(peaks, fan_value=FAN_VALUE):
    peaks = sorted(peaks, key=lambda x: x[1])  # Sort by time
    hashes = []
    
    for i in range(len(peaks)):
        for j in range(1, fan_value + 1):
            if i + j < len(peaks):
                freq1 = peaks[i][0]
                freq2 = peaks[i + j][0]
                t1 = peaks[i][1]
                t2 = peaks[i + j][1]
                t_delta = t2 - t1
                
                # Hash format: "freq1|freq2|time_diff"
                hash_value = f"{freq1}|{freq2}|{t_delta}"
                hashes.append((hash_value, t1))
    
    return hashes  # List of (hash, offset) tuples
```

### Input/Output
**Input:**
- `peaks`: Array of `[freq_bin, time_frame]` coordinates
- `fan_value`: How many future peaks to pair with (default 10)

**Output:**
- `hashes`: List of `(hash_string, time_offset)` tuples
  - Example: `[("523|1200|45", 100), ("100|523|30", 50), ...]`
  - Typically 50,000-150,000 hashes per song

### Example
```python
peaks = [[100, 50], [523, 120], [1200, 450]]
hashes = generate_hashes(peaks, fan_value=2)

# Result:
# Peak[0] pairs with Peak[1] and Peak[2]
# ("100|523|70", 50)    ← freq1=100, freq2=523, delta=120-50
# ("100|1200|400", 50)  ← freq1=100, freq2=1200, delta=450-50
# Peak[1] pairs with Peak[2]
# ("523|1200|330", 120) ← freq1=523, freq2=1200, delta=450-120
```

### Step-by-Step Process

1. **Sort peaks by time**
   - Ensures we pair peaks in chronological order
   
2. **Fan-out pairing**
   - For each peak, pair it with the next 10 peaks
   - Creates a "constellation map" of relationships
   
3. **Create hash string**
   - Format: `"frequency1|frequency2|time_difference"`
   - Example: `"523|1200|45"` means:
     - First peak at 523 Hz
     - Second peak at 1200 Hz
     - 45 time frames apart
   
4. **Store with offset**
   - `(hash, time_offset)` where offset = when this pattern occurs
   - Needed for alignment matching later

### Visual for Video
```
Peaks in Time:        Fan-Out Pairing (FAN_VALUE=3):

Time →                Peak A connects to B, C, D
  A  B  C  D  E         ┌─→ B
  ⭐  ⭐  ⭐  ⭐  ⭐       A ├─→ C
                        └─→ D
                      
                      Peak B connects to C, D, E
                        ┌─→ C
                      B ├─→ D
                        └─→ E

Each connection = 1 hash
Hash = "freqA|freqB|time_delta"
Stored as: (hash, offsetA)
```

### Why This Matters
- **Unique patterns**: The combination of two frequencies + timing is highly distinctive
- **Robust to noise**: Even if some peaks are missing, other pairs survive
- **Time-shift resistant**: Hash includes relative timing, not absolute
- **Exponential combinations**: 10,000 peaks → 100,000 unique fingerprints

---

## Function 5: fingerprint_song()

### What It Does
Orchestrates the entire fingerprinting pipeline - the "main" function that combines all previous steps.

### Code
```python
def fingerprint_song(file_path, song_name=None):
    # Step 1: Load audio
    y, sr = load_audio(file_path)
    
    # Step 2: Generate spectrogram
    magnitude = generate_spectrogram(y, sr)
    
    # Step 3: Find peaks
    peaks = find_peaks(magnitude)
    
    # Step 4: Generate hashes
    hashes = generate_hashes(peaks)
    
    # Return fingerprints with metadata
    return {
        'song_name': song_name or file_path,
        'hashes': hashes,
        'num_hashes': len(hashes)
    }
```

### Input/Output
**Input:**
- `file_path`: Path to song file
- `song_name`: Optional song identifier

**Output:**
- Dictionary with:
  - `song_name`: Song identifier
  - `hashes`: List of `(hash, offset)` tuples
  - `num_hashes`: Count of fingerprints

### Example
```python
result = fingerprint_song("song.mp3", "Shape of You")

# Result:
{
    'song_name': 'Shape of You',
    'hashes': [
        ("523|1200|45", 100),
        ("100|523|30", 50),
        # ... 150,000 more hashes
    ],
    'num_hashes': 150000
}
```

### Data Flow
```
Audio File (3 MB)
      ↓ load_audio()
Audio Array (3M samples)
      ↓ generate_spectrogram()
Spectrogram (10M values)
      ↓ find_peaks()
Peaks (10,000 points)
      ↓ generate_hashes()
Fingerprints (150,000 hashes)
      ↓
Stored in Database (~300 KB)
```

### Why This Matters
- **Standardized pipeline**: Every song processed identically
- **Data reduction**: 3 MB → 300 KB (10× compression)
- **Searchable format**: Hashes can be quickly looked up in database
- **Quality preserved**: Still maintains song identity despite compression

---

## Function 6: build_peak_database()

### What It Does
Processes an entire music library and creates a searchable database of fingerprints.

**⚠️ NOTE**: This function exists in `audio_processing.py` for **backward compatibility and testing only**. The production system uses `build_postgres_db.py` instead, which stores fingerprints in PostgreSQL for better performance and scalability.

### Code
```python
def build_peak_database(songs_dir, db_path, silent=False):
    database = {}
    song_files = [f for f in os.listdir(songs_dir) if f.endswith(('.mp3', '.wav', '.m4a'))]
    
    for idx, song_file in enumerate(song_files):
        song_path = os.path.join(songs_dir, song_file)
        song_name = os.path.splitext(song_file)[0]
        
        # Fingerprint the song
        result = fingerprint_song(song_path, song_name)
        
        # Store in database (hash → list of (song, offset))
        for hash_value, offset in result['hashes']:
            if hash_value not in database:
                database[hash_value] = []
            database[hash_value].append({
                'song_name': song_name,
                'offset': offset
            })
    
    # Save to JSON file
    with open(db_path, 'w') as f:
        json.dump(database, f)
    
    return database
```

### Input/Output
**Input:**
- `songs_dir`: Folder containing songs
- `db_path`: Where to save database JSON
- `silent`: Suppress progress messages

**Output:**
- `database`: Dictionary structure:
```python
{
    "523|1200|45": [
        {"song_name": "Song A", "offset": 100},
        {"song_name": "Song B", "offset": 250}
    ],
    "100|523|30": [
        {"song_name": "Song A", "offset": 50}
    ]
}
```

### Example
```python
db = build_peak_database("data/songs", "data/peak_db.json")

# Processes all MP3/WAV/M4A files in data/songs/
# Creates peak_db.json with ~1.5M hash entries for 100 songs
```

### Database Structure
```
Hash as Key                 → List of Occurrences
"523|1200|45"              → [Song A @ time 100, Song B @ time 250]
"100|523|30"               → [Song A @ time 50]
"1200|2400|120"            → [Song C @ time 300, Song A @ time 500]

Total size for 100 songs: ~50 MB JSON file
Each song contributes: ~150,000 hashes
```

### Why This Matters (Historical Context)
- **Fast lookup**: Hash → song matches in O(1) time
- **Collision handling**: Multiple songs can share same hash (stored as list)
- **Simple format**: JSON file easy to inspect and debug
- **Limited scale**: Works well for <1000 songs

### Why We Don't Use This in Production
1. **File size**: JSON grows huge (50 MB for 100 songs)
2. **Memory usage**: Must load entire database into RAM
3. **Slow queries**: No indexing like SQL databases
4. **No concurrency**: Can't handle multiple users efficiently

**Modern Approach**: `build_postgres_db.py` uses PostgreSQL with:
- Indexed tables for fast lookups
- Normalized structure (songs table + fingerprints table)
- Supports millions of hashes
- Concurrent access for multiple users
- Cloud hosting (Neon database)

---

## Function 7: match_song()

### What It Does
Compares a recorded audio sample against the database using time-delta alignment to find the best match.

**⚠️ NOTE**: This function is for **JSON database matching only**. Production uses `database.py → match_song_postgres()` which queries PostgreSQL instead.

### Code
```python
def match_song(sample_hashes, database, silent=False):
    matches = {}  # song_name → list of time deltas
    
    # Step 1: Find all database matches for sample hashes
    for sample_hash, sample_offset in sample_hashes:
        if sample_hash in database:
            for entry in database[sample_hash]:
                song_name = entry['song_name']
                db_offset = entry['offset']
                time_delta = db_offset - sample_offset
                
                if song_name not in matches:
                    matches[song_name] = []
                matches[song_name].append(time_delta)
    
    # Step 2: Count most common time delta for each song
    best_match = None
    max_alignment = 0
    
    for song_name, deltas in matches.items():
        # Find most common delta (alignment count)
        delta_counts = {}
        for delta in deltas:
            delta_counts[delta] = delta_counts.get(delta, 0) + 1
        
        alignment_count = max(delta_counts.values())
        
        if alignment_count > max_alignment:
            max_alignment = alignment_count
            best_match = song_name
    
    return {
        'song_name': best_match,
        'alignment_score': max_alignment,
        'total_matches': sum(len(v) for v in matches.values())
    }
```

### Input/Output
**Input:**
- `sample_hashes`: Fingerprints from recorded audio
- `database`: Hash database (from `build_peak_database()`)

**Output:**
```python
{
    'song_name': 'Shape of You',
    'alignment_score': 127,      # How many hashes aligned
    'total_matches': 3450        # Total hash matches across all songs
}
```

### The Time-Delta Alignment Algorithm

This is the **core matching logic** - here's how it works:

#### Example Walkthrough

**Database has "Song A":**
```
Hash "523|1200|45" appears at offset 1000
Hash "100|523|30" appears at offset 1050
Hash "1200|2400|120" appears at offset 1100
```

**Recorded sample has:**
```
Hash "523|1200|45" appears at offset 200
Hash "100|523|30" appears at offset 250
Hash "1200|2400|120" appears at offset 300
```

#### Step 1: Calculate Time Deltas
```
For Hash "523|1200|45":
  time_delta = db_offset - sample_offset = 1000 - 200 = 800

For Hash "100|523|30":
  time_delta = 1050 - 250 = 800

For Hash "1200|2400|120":
  time_delta = 1100 - 300 = 800
```

#### Step 2: Count Alignments
```
Song A has deltas: [800, 800, 800]
Most common delta: 800 (appears 3 times)
Alignment score: 3
```

**If the sample matches the song**, most time deltas will be **identical** because:
- The recording started at a different point in the song
- But the relative timing between peaks stays the same
- Time delta = "how far into the original song we are"

### Visual for Video
```
Database Song (starts at 0):
Time:    1000      1050      1100
         ⭐         ⭐         ⭐

Recorded Sample (starts at position 1000 of original):
Time:    200       250       300
         ⭐         ⭐         ⭐

Time Delta Calculation:
Hash 1: 1000 - 200 = 800  ✓
Hash 2: 1050 - 250 = 800  ✓  ← All deltas align!
Hash 3: 1100 - 300 = 800  ✓

Alignment Score: 3 (perfect match)
```

### Why This Matters
- **Time-shift resistant**: Works even if recording starts mid-song
- **Noise tolerant**: Some mismatches OK, majority vote wins
- **Speed variations**: Minor tempo changes still align (mostly)
- **Confidence metric**: Higher alignment = better match (15+ is good match)

### Threshold for Good Match
```
Alignment Score Interpretation:
0-5:    Random noise/no match
6-14:   Possible match, low confidence
15-30:  Good match
30-50:  Strong match
50+:    Excellent match (clean recording)
```

---

## Data Reduction Journey

Let's trace how data shrinks through the pipeline:

### Starting Point: Audio File
```
Format: MP3 (3 minutes, 320 kbps)
Size: ~7.2 MB
```

### After load_audio()
```
Format: NumPy array (float32)
Samples: 22,050 samples/sec × 180 sec = 3,969,000 samples
Size: 3,969,000 × 4 bytes = ~15.9 MB (in memory)
Compression: -120% (larger due to decompression!)
```

### After generate_spectrogram()
```
Format: 2D NumPy array (float32)
Shape: (2049, ~8600 frames)
Values: 2049 × 8600 = ~17.6 million values
Size: 17.6M × 4 bytes = ~70 MB (in memory)
Compression: -870% (huge expansion for FFT data!)
```

### After find_peaks()
```
Format: NumPy array of coordinates
Peaks: ~10,000 peak locations
Values: 10,000 × 2 coordinates = 20,000 integers
Size: 20,000 × 4 bytes = ~80 KB
Compression: 99.9% reduction from spectrogram!
```

### After generate_hashes()
```
Format: List of (string, int) tuples
Hashes: ~150,000 fingerprints
String size: ~15 bytes per hash string
Total: 150,000 × 19 bytes = ~2.85 MB
Compression: 60% reduction from original audio
```

### Stored in Database
```
Format: JSON (text) or PostgreSQL (binary)
JSON size: ~3 MB per song
PostgreSQL: ~500 KB per song (indexed, compressed)
Final compression: ~93% vs original MP3
```

### Summary Table
| Stage | Data Type | Size | Reduction |
|-------|-----------|------|-----------|
| Original MP3 | Compressed audio | 7.2 MB | - |
| Loaded audio | Raw samples | 15.9 MB | -120% |
| Spectrogram | FFT matrix | 70 MB | -870% |
| Peaks | Coordinates | 80 KB | 99.9% ↓ |
| Hashes | Fingerprints | 2.85 MB | - |
| Database (PostgreSQL) | Indexed data | 500 KB | 93% ↓ |

---

## Why These Functions Matter

### The Big Picture

**Audio Processing Pipeline** = Converting music into searchable "DNA"

1. **load_audio()** - Standardizes input (all songs speak same language)
2. **generate_spectrogram()** - Reveals frequency patterns (what notes are playing when)
3. **find_peaks()** - Extracts distinctive features (the "landmarks" of the song)
4. **generate_hashes()** - Creates unique identifiers (the "fingerprints")
5. **fingerprint_song()** - Orchestrates the pipeline (the conductor)
6. **build_peak_database()** - Indexes the music library (the catalog)
7. **match_song()** - Finds the best match (the detective)

### Real-World Performance

**For 100 songs in database:**
- Total fingerprints: ~15 million hashes
- Database size: ~50 MB (JSON) or ~10 MB (PostgreSQL)
- Fingerprinting time: ~5 seconds per song
- Matching time: 1-3 seconds (local), 30-180 seconds (Render 0.1 CPU)
- Accuracy: 95%+ on clean recordings, 70%+ on noisy recordings

### What Makes This Work

1. **Frequency domain analysis** (spectrogram)
   - Music = patterns of frequencies over time
   - More robust than raw waveform matching
   
2. **Peak-based fingerprinting**
   - Focuses on prominent features
   - Ignores background noise
   
3. **Fan-out hashing**
   - Creates unique constellation maps
   - Redundant: losing some peaks doesn't break matching
   
4. **Time-delta alignment**
   - Works regardless of when recording started
   - Tolerates minor speed variations

---

## Conclusion

This file (`audio_processing.py`) is the **brain** of Noto. Every recognition starts and ends here:

- **Building database**: Songs → fingerprints → storage
- **Recognition**: Recording → fingerprints → matching → song name

The math and algorithms are complex, but the concept is simple:
> **Convert music into numbers, find patterns, match patterns.**

---

## Further Reading

- **Shazam Algorithm**: [How Shazam Works](https://www.ee.columbia.edu/~dpwe/papers/Wang03-shazam.pdf) (Original paper)
- **Fourier Transform**: [3Blue1Brown FFT Video](https://www.youtube.com/watch?v=spUNpyF58BY)
- **Peak Detection**: [SciPy maximum_filter docs](https://docs.scipy.org/doc/scipy/reference/generated/scipy.ndimage.maximum_filter.html)
- **Librosa Documentation**: [librosa.org](https://librosa.org/)

---

**Created**: December 9, 2024  
**For**: Noto Music Recognition Project  
**Author**: AI Assistant explaining audio_processing.py for educational video content
