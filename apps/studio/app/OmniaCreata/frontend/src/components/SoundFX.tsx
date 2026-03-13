import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';

// SoundFX (Web Audio): lightweight, no external deps.
// Starts on first user interaction due to browser autoplay policies.

function noteToFreq(note: string): number {
  // e.g., 'C4', 'D#4', 'A3'
  const A4 = 440;
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const m = note.match(/^([A-G]#?)(-?\d)$/);
  if (!m) return A4;
  const [, n, o] = m;
  const nIdx = NOTES.indexOf(n);
  const octave = parseInt(o, 10);
  const semitoneFromA4 = nIdx - NOTES.indexOf('A') + (octave - 4) * 12;
  return A4 * Math.pow(2, semitoneFromA4 / 12);
}

const scale = ['C4', 'E4', 'G4', 'A3', 'B3', 'D4'];

const SoundFX: React.FC = () => {
  const { state } = useStore();
  const [started, setStarted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const loopId = useRef<number | null>(null);

  useEffect(() => {
    const startAudio = async () => {
      if (started) return;
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ctxRef.current = ctx;

        // Master
        const master = ctx.createGain();
        master.gain.value = 0.3; // fixed volume
        master.connect(ctx.destination);
        masterRef.current = master;

        // Simple feedback delay + filter to create space (reverb-ish)
        const delay = ctx.createDelay(4.0);
        delay.delayTime.value = 0.6;
        const fb = ctx.createGain();
        fb.gain.value = 0.35;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1800;
        delay.connect(fb);
        fb.connect(lp);
        lp.connect(delay);
        delay.connect(master);

        const playNote = (freq: number, dur = 1.6) => {
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const amp = ctx.createGain();
          amp.gain.value = 0.0;

          // gentle envelope
          amp.gain.linearRampToValueAtTime(0.0001, t);
          amp.gain.exponentialRampToValueAtTime(0.18, t + 0.8);
          amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);

          const mildChorus = ctx.createOscillator();
          mildChorus.type = 'sine';
          mildChorus.frequency.value = 0.4 + Math.random() * 0.3;
          const chorusGain = ctx.createGain();
          chorusGain.gain.value = 4; // mod depth in cents via detune
          mildChorus.connect(chorusGain);
          chorusGain.connect(osc.detune);
          mildChorus.start();

          // chain: osc -> amp -> delay (for space) -> master
          osc.connect(amp);
          amp.connect(delay);
          amp.connect(master);

          osc.start();
          osc.stop(t + dur + 1.4);
          setTimeout(() => {
            osc.disconnect();
            amp.disconnect();
            mildChorus.disconnect();
          }, (dur + 1.6) * 1000);
        };

        // background loop
        const loop = () => {
          if (!state.soundOn) return; // respect sound toggle
          const n = scale[Math.floor(Math.random() * scale.length)];
          const f = noteToFreq(n);
          playNote(f, 2.0 + Math.random() * 1.5);
        };
        loop();
        loopId.current = window.setInterval(loop, 2000);

        // resume context on interaction if suspended
        if (ctx.state === 'suspended') await ctx.resume();
        setStarted(true);
      } catch (e) {
        console.warn('Audio init failed', e);
      }
    };

    const onFirstInteraction = () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      if (state.soundOn) startAudio();
    };
    window.addEventListener('pointerdown', onFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      if (loopId.current) window.clearInterval(loopId.current);
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, [started, state.soundOn]);



  // handle toggling sound after started
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (state.soundOn && ctx.state === 'suspended') ctx.resume();
    if (!state.soundOn && ctx.state === 'running') ctx.suspend();
  }, [state.soundOn]);

  return null;
};

export default SoundFX;