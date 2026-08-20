// Shared site interactions

document.addEventListener('DOMContentLoaded', () => {
  // === Inject immersive background layers ===
  const bgWrap = document.createElement('div');
  bgWrap.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:-1; overflow:hidden;';
  bgWrap.innerHTML = `
    <div class="bg-layer bg-base"></div>
    <div class="bg-layer bg-mesh"></div>
    <div class="bg-layer bg-aurora"></div>
    <canvas class="bg-layer bg-constellation" id="bgConstellation"></canvas>
    <div class="bg-layer bg-particles"></div>
    <div class="bg-layer bg-grain"></div>
    <div class="bg-layer bg-vignette"></div>
  `;
  document.body.insertBefore(bgWrap, document.body.firstChild);

  // === Animated constellation network on canvas ===
  const canvas = document.getElementById('bgConstellation');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W, H, dpr;
    const particles = [];
    const PARTICLE_COUNT = 70;
    const MAX_DISTANCE = 160;
    const MOUSE_RADIUS = 200;

    const mouse = { x: -1000, y: -1000 };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const COLORS = [
      { r: 72,  g: 207, b: 173 }, // emerald
      { r: 100, g: 200, b: 255 }, // cyan
      { r: 94,  g: 92,  b: 230 }, // indigo
      { r: 255, g: 193, b: 60  }, // gold
      { r: 255, g: 255, b: 255 }, // white
    ];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.5 + 0.5,
          baseOpacity: Math.random() * 0.4 + 0.2,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.005 + Math.random() * 0.01,
          color: color,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Update + draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Bounce off edges
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        // Mouse repulsion (subtle)
        const dxm = p.x - mouse.x;
        const dym = p.y - mouse.y;
        const distM = Math.sqrt(dxm * dxm + dym * dym);
        if (distM < MOUSE_RADIUS) {
          const force = (MOUSE_RADIUS - distM) / MOUSE_RADIUS * 0.5;
          p.x += (dxm / Math.max(distM, 1)) * force;
          p.y += (dym / Math.max(distM, 1)) * force;
        }

        const pulseOpacity = p.baseOpacity + Math.sin(p.pulse) * 0.15;

        // Draw particle with glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grad.addColorStop(0, `rgba(${p.color.r},${p.color.g},${p.color.b},${pulseOpacity})`);
        grad.addColorStop(0.5, `rgba(${p.color.r},${p.color.g},${p.color.b},${pulseOpacity * 0.3})`);
        grad.addColorStop(1, `rgba(${p.color.r},${p.color.g},${p.color.b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.r * 4), 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${Math.min(1, pulseOpacity * 2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.r), 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DISTANCE) {
            const opacity = (1 - dist / MAX_DISTANCE) * 0.18;
            // Blend colors of both endpoints
            const mr = (a.color.r + b.color.r) / 2;
            const mg = (a.color.g + b.color.g) / 2;
            const mb = (a.color.b + b.color.b) / 2;
            ctx.strokeStyle = `rgba(${mr|0},${mg|0},${mb|0},${opacity})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // Mouse-particle connections (brighter)
        const dx = particles[i].x - mouse.x;
        const dy = particles[i].y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS) {
          const opacity = (1 - dist / MOUSE_RADIUS) * 0.35;
          const c = particles[i].color;
          ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      if (!reducedMotion) {
        rafId = requestAnimationFrame(draw);
      }
    }

    let rafId = null;

    function start() {
      if (reducedMotion) {
        draw(); // draw once
      } else if (!rafId) {
        rafId = requestAnimationFrame(draw);
      }
    }
    function stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    resize();
    initParticles();
    start();

    // Pause animation when tab is hidden (perf)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });

    // Throttled resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); initParticles(); }, 200);
    });

    // Mouse tracking (only when over background, not when interacting with UI)
    document.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      mouse.x = -1000; mouse.y = -1000;
    });
  }

  // === Sticky nav background on scroll ===
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 8) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // === Scroll reveal ===
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  // === Mobile menu toggle ===
  const mobileToggle = document.querySelector('.nav-mobile-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      const links = document.querySelector('.nav-links');
      if (links) {
        const isShown = links.style.display === 'flex';
        links.style.display = isShown ? '' : 'flex';
        links.style.position = 'absolute';
        links.style.top = '64px';
        links.style.left = '0';
        links.style.right = '0';
        links.style.flexDirection = 'column';
        links.style.background = 'rgba(2,4,10,0.95)';
        links.style.padding = '16px';
        links.style.borderBottom = '0.5px solid var(--glass-border-strong)';
        links.style.backdropFilter = 'blur(20px)';
      }
    });
  }

  // === Year in footer ===
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
});
