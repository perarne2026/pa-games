import numpy as np, wave
sr=48000
rng=np.random.default_rng(1)
def shape(x, gains):  # gains: list of (f, dB) piecewise-linear spectral envelope
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/sr)
    fs=[g[0] for g in gains]; db=[g[1] for g in gains]
    X*=10**(np.interp(f,fs,db)/20); return np.fft.irfft(X,len(x))
def noise(sec): return rng.standard_normal(int(sr*sec))
def norm(x,db): return x/np.sqrt(np.mean(x**2))*10**(db/20)
room=lambda sec: norm(shape(noise(sec),[(0,0),(500,-10),(3000,-25),(20000,-35)]),-60)
segs=[]
def add(x): segs.append(x)
add(room(1.5))
# vasst s: topp 5-9 kHz, -30dB under 3k
s=norm(shape(noise(2),[(0,-45),(2500,-35),(4000,-15),(5500,0),(8000,0),(11000,-8),(16000,-20),(24000,-30)]),-25); add(s+room(2)); add(room(1))
# läsp θ: platt, svagare
th=norm(shape(noise(2),[(0,-15),(1000,0),(10000,-3),(16000,-10),(24000,-20)]),-32); add(th+room(2)); add(room(1))
# sch / sidoläsp: topp 2-4 kHz
sh=norm(shape(noise(2),[(0,-40),(1500,-10),(2500,0),(4000,0),(6000,-15),(10000,-25),(24000,-35)]),-25); add(sh+room(2)); add(room(1))
# vokal
t=np.arange(int(sr*1.5))/sr; v=sum(np.sin(2*np.pi*200*k*t)/k for k in range(1,25)); v=norm(shape(v,[(0,0),(700,0),(1200,-6),(2500,-15),(5000,-30),(24000,-50)]),-22); add(v+room(1.5)); add(room(1.5))
x=np.concatenate(segs); x=np.clip(x,-1,1)
w=wave.open(__import__('os').path.join(__import__('os').path.dirname(__file__),'test.wav'),'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x*32767).astype(np.int16).tobytes()); w.close()
print(len(x)/sr,'s')
