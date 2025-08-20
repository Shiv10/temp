import { useCallback, useRef, useEffect } from 'react';

export const useSoundManager = (soundEnabled: boolean) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio context
  const initializeAudio = useCallback(() => {
    if (!isInitializedRef.current && typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        isInitializedRef.current = true;
      } catch (error) {
        console.warn('Audio context not supported:', error);
      }
    }
  }, []);

  // Lazily create background audio element
  const ensureBackgroundAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!bgAudioRef.current) {
      const audio = new Audio('/audio.mp3');
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0.25;
      audio.autoplay = true;
      // helps iOS allow inline playback
      (audio as any).playsInline = true;
      audio.setAttribute('playsinline', 'true');
      bgAudioRef.current = audio;
    }
  }, []);

  // Create and play a tone
  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) => {
    if (!soundEnabled || !audioContextRef.current) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }, [soundEnabled]);

  // Create noise for rake sound
  const playNoise = useCallback((duration: number, volume: number = 0.03) => {
    if (!soundEnabled || !audioContextRef.current) return;

    try {
      const bufferSize = audioContextRef.current.sampleRate * duration;
      const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * volume;
      }
      
      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();
      const filterNode = audioContextRef.current.createBiquadFilter();
      
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
      
      source.buffer = buffer;
      source.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      gainNode.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);
      
      source.start(audioContextRef.current.currentTime);
    } catch (error) {
      console.warn('Error playing noise:', error);
    }
  }, [soundEnabled]);

  // Play specific sounds
  const playSound = useCallback((sound: string) => {
    if (!soundEnabled) return;

    initializeAudio();
    ensureBackgroundAudio();

    switch (sound) {
      case 'rake':
        playNoise(0.3, 0.02);
        break;
      case 'place':
        // Gentle bell-like sound
        playTone(523.25, 0.5, 'sine', 0.08); // C5
        setTimeout(() => playTone(659.25, 0.3, 'sine', 0.05), 100); // E5
        break;
      case 'clear':
        // Gentle sweep sound
        if (audioContextRef.current) {
          const startFreq = 200;
          const endFreq = 100;
          const duration = 0.8;
          const oscillator = audioContextRef.current.createOscillator();
          const gainNode = audioContextRef.current.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContextRef.current.destination);
          
          oscillator.frequency.setValueAtTime(startFreq, audioContextRef.current.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioContextRef.current.currentTime + duration);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.05, audioContextRef.current.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);
          
          oscillator.start(audioContextRef.current.currentTime);
          oscillator.stop(audioContextRef.current.currentTime + duration);
        }
        break;
      case 'undo':
        // Quick soft chime
        playTone(880, 0.2, 'sine', 0.04);
        break;
      default:
        break;
    }
  }, [soundEnabled, initializeAudio, ensureBackgroundAudio, playTone, playNoise]);

  const toggleSound = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    // Also try to play background audio if enabled
    try {
      ensureBackgroundAudio();
      if (soundEnabled) {
        bgAudioRef.current?.play().catch(() => {});
      } else {
        bgAudioRef.current?.pause();
      }
    } catch {}
  }, []);

  // Initialize audio context on user interaction
  useEffect(() => {
    const tryStart = () => {
      initializeAudio();
      ensureBackgroundAudio();
      if (soundEnabled) {
        bgAudioRef.current?.play().catch(() => {});
      }
    };

    const handler = () => {
      tryStart();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tryStart();
      }
    };

    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('pointerdown', handler);
    document.addEventListener('keydown', handler);
    document.addEventListener('mousemove', handler, { passive: true });
    document.addEventListener('wheel', handler, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('pointerdown', handler);
      document.removeEventListener('keydown', handler);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('mousemove', handler as any);
      document.removeEventListener('wheel', handler as any);
    };
  }, [initializeAudio, ensureBackgroundAudio, soundEnabled]);

  // React to soundEnabled changes for background audio
  useEffect(() => {
    ensureBackgroundAudio();
    const audio = bgAudioRef.current;
    if (!audio) return;
    if (soundEnabled) {
      const attempt = () => audio.play().catch(() => {});
      attempt();
      const id = setInterval(() => {
        if (!bgAudioRef.current || !soundEnabled) return;
        if (bgAudioRef.current.paused) {
          bgAudioRef.current.play().catch(() => {});
        } else {
          clearInterval(id);
        }
      }, 1500);
      return () => clearInterval(id);
    } else {
      audio.pause();
    }
  }, [soundEnabled, ensureBackgroundAudio]);

  // Cleanup
  useEffect(() => {
    return () => {
      try {
        bgAudioRef.current?.pause();
        bgAudioRef.current = null;
      } catch {}
    };
  }, []);

  return {
    playSound,
    toggleSound
  };
};