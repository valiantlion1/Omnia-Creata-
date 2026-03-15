import React, { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';

// BackgroundFX: performant canvas-based aurora/particle field that reacts to mouse.
// No external libraries required. Colors adapt to CSS variables set by current theme.

const useThemeColors = () => {
  const get = () => {
    const root = document.documentElement;
    const getVar = (v: string) => getComputedStyle(root).getPropertyValue(v).trim();
    const accent = getVar('--accent') || '200,140,255';
    const goldA = getVar('--goldA') || '255,215,130';
    const goldB = getVar('--goldB') || '249,198,118';
    return { accent, goldA, goldB };
  };
  return get;
};

const BackgroundFX: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouse = useRef({ x: 0, y: 0, t: 0 });
  const theme = useThemeColors();
  const { state } = useStore();

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext('2d', { alpha: true })!;

    const setSize = () => {
      const ratio = window.devicePixelRatio || 1;
      cvs.width = Math.floor(cvs.clientWidth * ratio);
      cvs.height = Math.floor(cvs.clientHeight * ratio);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(ratio, ratio);
    };

    setSize();

    let raf = 0;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; hue: number; z: number }[] = [];

    const BASE_MAP = {
      eco: 45,
      normal: 90,
      quality: 160,
    } as const;

    const BASE = BASE_MAP[state.fxQuality] ?? 90; // base particle count by quality

    const seedParticles = () => {
      particles.length = 0;
      const sizeRatio = Math.max(1, Math.min(1.8, cvs.clientWidth / 1200));
      const count = Math.floor(BASE * sizeRatio);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * cvs.clientWidth,
          y: Math.random() * cvs.clientHeight,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: 1 + Math.random() * 2.2,
          hue: 180 + Math.random() * 180,
          z: Math.random(), // depth 0..1 for 3D mode
        });
      }
    };

    seedParticles();

    const onResize = () => {
      setSize();
      seedParticles();
    };

    const onMove = (e: MouseEvent) => {
      const rect = cvs.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
      mouse.current.t = performance.now();
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove);

    const drawWaves = (t: number) => {
      const { goldA, accent } = theme();
      const lines = state.fxQuality === 'quality' ? 5 : state.fxQuality === 'normal' ? 3 : 2;
      for (let i = 0; i < lines; i++) {
        const amp = 12 + i * 8;
        const yOff = cvs.clientHeight * 0.65 + i * 14;
        ctx.beginPath();
        for (let x = 0; x <= cvs.clientWidth; x += 8) {
          const y = yOff + Math.sin(x * 0.01 + t * 0.0015 + i) * amp;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        const alpha = state.fxQuality === 'quality' ? 0.20 : state.fxQuality === 'normal' ? 0.14 : 0.08;
        ctx.strokeStyle = `rgba(${i % 2 ? goldA : accent}, ${alpha})`;
        ctx.lineWidth = 1.2 + i * 0.2;
        ctx.stroke();
      }
    };

    const draw = (t: number) => {
      const { accent, goldA } = theme();
      // fade previous frame for trails; less fade on eco for perf
      const fade = state.fxQuality === 'eco' ? 0.12 : 0.08;
      ctx.fillStyle = `rgba(2,2,8,${fade})`;
      ctx.fillRect(0, 0, cvs.clientWidth, cvs.clientHeight);

      // background wash / pseudo perspective when 3D
      if (state.fxMode === '3d') {
        const grad3 = ctx.createLinearGradient(0, 0, cvs.clientWidth, cvs.clientHeight);
        grad3.addColorStop(0, `rgba(${accent},${state.fxQuality==='quality'?0.18:0.12})`);
        grad3.addColorStop(1, `rgba(${goldA},${state.fxQuality==='quality'?0.10:0.06})`);
        ctx.fillStyle = grad3;
        ctx.fillRect(0, 0, cvs.clientWidth, cvs.clientHeight);
      } else {
        const grad = ctx.createRadialGradient(
          cvs.clientWidth * 0.2,
          cvs.clientHeight * 0.3,
          40,
          cvs.clientWidth * 0.5,
          cvs.clientHeight * 0.6,
          Math.max(cvs.clientWidth, cvs.clientHeight)
        );
        grad.addColorStop(0, `rgba(${accent},${state.fxQuality==='quality'?0.14:0.10})`);
        grad.addColorStop(0.5, `rgba(${goldA},${state.fxQuality==='quality'?0.10:0.06})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cvs.clientWidth, cvs.clientHeight);
      }

      // particles
      const mx = mouse.current.x || cvs.clientWidth / 2;
      const my = mouse.current.y || cvs.clientHeight / 2;

      for (const p of particles) {
        // flow field movement + slight mouse attraction
        const angle = Math.sin((p.y + t * 0.02) * 0.01) + Math.cos((p.x - t * 0.015) * 0.01);
        p.vx += Math.cos(angle) * 0.02 * (state.fxMode==='3d'? (0.6 + 0.8*p.z) : 1);
        p.vy += Math.sin(angle) * 0.02 * (state.fxMode==='3d'? (0.6 + 0.8*p.z) : 1);
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.hypot(dx, dy) + 0.001;
        const pull = Math.min(0.05, 40 / (dist * dist));
        p.vx += dx * pull * 0.02;
        p.vy += dy * pull * 0.02;

        // damping
        p.vx *= 0.985;
        p.vy *= 0.985;

        p.x += p.vx;
        p.y += p.vy;

        // wrap
        if (p.x < -10) p.x = cvs.clientWidth + 10;
        if (p.x > cvs.clientWidth + 10) p.x = -10;
        if (p.y < -10) p.y = cvs.clientHeight + 10;
        if (p.y > cvs.clientHeight + 10) p.y = -10;

        const depthScale = state.fxMode==='3d' ? (0.6 + 0.8 * p.z) : 1;
        const alpha = (state.fxQuality==='quality'?0.22:state.fxQuality==='normal'?0.18:0.12) * depthScale + 0.10 * Math.sin(t * 0.004 + p.hue);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${accent},${alpha})`;
        const rr = p.r * (state.fxMode==='3d' ? (0.7 + 1.2 * p.z) : 1);
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.fill();

        // occasional sparkle in 3D mode
        if (state.fxMode==='3d' && Math.random() < 0.002) {
          ctx.fillStyle = `rgba(${goldA},${0.25 + 0.5 * Math.random()})`;
          ctx.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);
        }
      }

      // soft waves
      drawWaves(t);

      // vignette
      const vgrad = ctx.createRadialGradient(
        cvs.clientWidth / 2,
        cvs.clientHeight / 2,
        Math.min(cvs.clientWidth, cvs.clientHeight) * 0.3,
        cvs.clientWidth / 2,
        cvs.clientHeight / 2,
        Math.max(cvs.clientWidth, cvs.clientHeight) * 0.8
      );
      vgrad.addColorStop(0, 'rgba(0,0,0,0)');
      vgrad.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = vgrad;
      ctx.fillRect(0, 0, cvs.clientWidth, cvs.clientHeight);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
    };
  // re-seed when quality or mode changes
  }, [state.fxQuality, state.fxMode]);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default BackgroundFX;