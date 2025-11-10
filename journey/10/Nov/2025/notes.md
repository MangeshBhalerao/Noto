ISSUE 1 : MFCC is not good for recording audio type system tried 30 seconds recording instead of 10 but still it failed

ISSUE 2 : We have implemented the peak , but now the db is lot bigger and it failed due to size so what we will do is take only important peaks and create new file of peak_db so the size of the json file will be less 



Aspect		        MFCC Averaging                         Peak-Based
What it captures	Average sound over time	            Specific unique moments
Clip vs Full Song	❌ Different averages	            ✅ Same peaks exist in both
Noise resistance	❌ Noise changes average	            ✅ Peaks still detectable
Partial matching	❌ Can't match part of song	        ✅ Matches any segment
Uniqueness	        ❌ Many songs have similar averages	✅ Peak combinations are unique
Real-world use	    ❌ Research/classification only	    ✅ Used by Shazam, SoundHound


Audio processing 
test_peaking
build_peak