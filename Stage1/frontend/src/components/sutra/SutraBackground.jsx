import React, { useEffect, useRef } from 'react';

// Animated constellation background (ported from the Sutra demo).
const SutraBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf = null;
    let ps = [];
    const N = 60, MAX = 155, MR = 190;
    const mouse = { x: -1e4, y: -1e4 };
    const C = [[94, 92, 230], [100, 210, 255], [191, 90, 242], [255, 193, 60], [246, 246, 248]];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const init = () => {
      ps = [];
      for (let i = 0; i < N; i++) {
        const c = C[i % C.length];
        ps.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, r: Math.random() * 1.4 + .5, o: Math.random() * .4 + .2, ph: Math.random() * 6.28, ps: .004 + Math.random() * .009, c });
      }
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]; p.x += p.vx; p.y += p.vy; p.ph += p.ps;
        if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
        const dxm = p.x - mouse.x, dym = p.y - mouse.y, dm = Math.sqrt(dxm * dxm + dym * dym);
        if (dm < MR) { const f = (MR - dm) / MR * .5; p.x += dxm / Math.max(dm, 1) * f; p.y += dym / Math.max(dm, 1) * f; }
        const o = p.o + Math.sin(p.ph) * .15, g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${o})`);
        g.addColorStop(1, `rgba(${p.c[0]},${p.c[1]},${p.c[2]},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.1, p.r * 4), 0, 6.29); ctx.fill();
        ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${Math.min(1, o * 2)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.1, p.r), 0, 6.29); ctx.fill();
      }
      for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) {
        const dx = ps[a].x - ps[b].x, dy = ps[a].y - ps[b].y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX) {
          const op = (1 - d / MAX) * .16;
          ctx.strokeStyle = `rgba(${(ps[a].c[0] + ps[b].c[0]) / 2 | 0},${(ps[a].c[1] + ps[b].c[1]) / 2 | 0},${(ps[a].c[2] + ps[b].c[2]) / 2 | 0},${op})`;
          ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(ps[a].x, ps[a].y); ctx.lineTo(ps[b].x, ps[b].y); ctx.stroke();
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    const start = () => { if (reduce) draw(); else if (!raf) raf = requestAnimationFrame(draw); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };

    resize(); init(); start();
    const onVis = () => (document.hidden ? stop() : start());
    let rt;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { resize(); init(); }, 200); };
    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = -1e4; mouse.y = -1e4; };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div className="s-bg" aria-hidden="true">
      <div className="s-bg-base" />
      <div className="s-bg-mesh" />
      <canvas ref={canvasRef} />
      <div className="s-bg-vignette" />
    </div>
  );
};

export default SutraBackground;
