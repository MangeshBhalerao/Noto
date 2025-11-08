import librosa
import librosa.display
import matplotlib.pyplot as plt

path = "../../data/songs/Kanye West - Can't Tell Me Nothing.mp3"

#plot waveform
y, sr = librosa.load(path)
plt.figure(figsize=(10,3))
librosa.display.waveshow(y,sr=sr)
plt.title("Waveform")
plt.show()


# Plot spectrogram
x = librosa.stft(y)
Xdb = librosa.amplitude_to_db(abs(x))
plt.figure(figsize=(10,4))
librosa.display.specshow(Xdb,sr=sr,x_axis='time',y_axis='hz')
plt.colorbar()
plt.title("Spectrogramm")
plt.show()

mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
plt.figure(figsize=(10, 4))
librosa.display.specshow(mfccs, x_axis='time', sr=sr)
plt.colorbar()
plt.title("MFCC (Audio Fingerprint)")
plt.show()
