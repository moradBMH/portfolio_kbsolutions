/* ── Loader ── */
(function() {
  const loader = document.getElementById('loader');
  const countEl = document.getElementById('loaderCount');
  const barEl = document.getElementById('loaderBar');
  const bgEl = document.getElementById('bgImage');

  let progress = 0;
  let targetProgress = 0;
  let videoReady = false;

  // Animate counter smoothly toward target
  function tick() {
    if (progress < targetProgress) {
      progress += Math.max(1, Math.round((targetProgress - progress) * 0.12));
      if (progress > targetProgress) progress = targetProgress;
    }
    countEl.textContent = progress;
    barEl.style.width = progress + '%';

    if (progress >= 100) {
      setTimeout(() => loader.classList.add('done'), 200);
      return;
    }
    requestAnimationFrame(tick);
  }

  // Simulate progress while video buffers
  const fakeInterval = setInterval(() => {
    if (!videoReady && targetProgress < 85) {
      targetProgress += Math.random() * 8 + 2;
      if (targetProgress > 85) targetProgress = 85;
    }
  }, 200);

  function onBgReady() {
    if (videoReady) return;
    videoReady = true;
    clearInterval(fakeInterval);
    targetProgress = 100;
  }

  // Précharge l'image de fond
  const bgImg = new Image();
  bgImg.onload = onBgReady;
  bgImg.onerror = onBgReady;
  bgImg.src = 'Slide/cover/background-portfolio.png';
  if (bgImg.complete) onBgReady();
  // Sécurité : ne jamais bloquer plus de 5 s
  setTimeout(onBgReady, 5000);

  requestAnimationFrame(tick);
})();

const slides = document.querySelectorAll('.slide');
const totalSlides = slides.length;
let current = 0;
let isAnimating = false;
const TRANSITION_DURATION = 600;

// Build nav dots
const dotsContainer = document.getElementById('navDots');
slides.forEach((_, i) => {
  const dot = document.createElement('button');
  dot.className = 'nav-dot' + (i === 0 ? ' active' : '');
  dot.addEventListener('click', () => goToSlide(i));
  dotsContainer.appendChild(dot);
});

document.getElementById('totalNum').textContent = String(totalSlides).padStart(2,'0');

function goToSlide(n) {
  if (n === current || isAnimating || n < 0 || n >= totalSlides) return;
  isAnimating = true;

  slides[current].querySelectorAll('.reveal').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
  });

  slides[current].classList.remove('active');
  current = n;
  slides[current].scrollTop = 0;
  slides[current].classList.add('active');

  requestAnimationFrame(() => {
    slides[current].querySelectorAll('.reveal').forEach(el => {
      el.style.opacity = '';
      el.style.transform = '';
    });
  });

  updateUI();
  setTimeout(() => { isAnimating = false; }, TRANSITION_DURATION);
}

function navigate(dir) {
  goToSlide(current + dir);
}

// État initial de l'interface (diapo 1)
document.addEventListener('DOMContentLoaded', updateUI);

function updateUI() {
  document.getElementById('currentNum').textContent = String(current + 1).padStart(2,'0');
  document.getElementById('progressBar').style.width = ((current / (totalSlides - 1)) * 100) + '%';
  document.querySelectorAll('.nav-dot').forEach((d, i) => {
    d.classList.toggle('active', i === current);
  });
  // Diapos sur photo : compteur et flèches en blanc
  const active = slides[current];
  const onPhoto = active.classList.contains('cover-immersive')
    || active.classList.contains('transition-slide')
    || active.classList.contains('contact-slide');
  document.body.classList.toggle('on-photo', onPhoto);
}

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
    e.preventDefault(); navigate(1);
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault(); navigate(-1);
  }
  if (e.key === 'f' || e.key === 'F') {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
});

// Scroll / Wheel
let wheelTimeout;
document.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (wheelTimeout) return;
  wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 800);
  navigate(e.deltaY > 0 ? 1 : -1);
}, { passive: false });

// Touch — swipe navigates only on non-scrollable slides
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
});
document.addEventListener('touchend', (e) => {
  const diff = touchStartY - e.changedTouches[0].clientY;
  const activeSlide = slides[current];
  const scrollable = activeSlide && activeSlide.scrollHeight > activeSlide.clientHeight + 10;
  // On scrollable slides, let the user scroll freely — navigation via tap zones
  if (scrollable) return;
  if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
});

// Mobile story-style tap zones (Instagram-like)
(function() {
  if (!('ontouchstart' in window)) return;

  const tapPrev = document.createElement('button');
  const tapNext = document.createElement('button');
  tapPrev.className = 'mobile-tap-zone mobile-tap-prev';
  tapNext.className = 'mobile-tap-zone mobile-tap-next';
  tapPrev.innerHTML = '&#8249;';
  tapNext.innerHTML = '&#8250;';
  document.body.appendChild(tapPrev);
  document.body.appendChild(tapNext);

  tapPrev.addEventListener('click', () => navigate(-1));
  tapNext.addEventListener('click', () => navigate(1));
})();

// Initialize first slide reveals
requestAnimationFrame(() => {
  slides[0].querySelectorAll('.reveal').forEach(el => {
    el.style.opacity = '';
    el.style.transform = '';
  });
});

/* ========================================================
   SNOWFALL + MOUSE REPULSION + PARALLAX
   ======================================================== */
(function() {
  const canvas = document.getElementById('snowCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Mouse tracking
  let mouseX = -9999;
  let mouseY = -9999;
  const MOUSE_RADIUS = Math.min(160, window.innerWidth * 0.25);
  let mouseActive = false;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseActive = true;
    parallax(e.clientX, e.clientY);
  });
  document.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
    mouseActive = false;
  });

  // Parallax effect on cover text
  const coverContent = document.getElementById('coverContent');
  function parallax(mx, my) {
    if (current !== 0 || !coverContent) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = (mx - cx) / cx; // -1 to 1
    const dy = (my - cy) / cy;
    coverContent.style.transform =
      `translate(${dx * -12}px, ${dy * -8}px)`;
  }

  // Resize canvas
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Snowflake class
  const FLAKE_COUNT = 280;
  const flakes = [];

  class Snowflake {
    constructor() { this.init(true); }

    init(randomY) {
      this.x = Math.random() * canvas.width;
      this.y = randomY
        ? Math.random() * canvas.height
        : -Math.random() * 40 - 5;
      this.size = Math.random() * 3.5 + 0.8;
      this.speedY = this.size * 0.3 + Math.random() * 0.4;
      this.speedX = Math.random() * 0.4 - 0.2;
      this.opacity = Math.random() * 0.5 + 0.2;
      this.wobbleAmp = Math.random() * 0.6 + 0.2;
      this.wobbleSpeed = Math.random() * 0.02 + 0.005;
      this.phase = Math.random() * Math.PI * 2;
      // Velocity from repulsion
      this.vx = 0;
      this.vy = 0;
    }

    update(t) {
      // Natural movement
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(t * this.wobbleSpeed + this.phase) * this.wobbleAmp;

      // Mouse repulsion (antigravity)
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < MOUSE_RADIUS && dist > 0) {
        const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS);
        const strength = force * force * 3.5;
        this.vx += (dx / dist) * strength;
        this.vy += (dy / dist) * strength;
      }

      // Apply velocity
      this.x += this.vx;
      this.y += this.vy;

      // Damping
      this.vx *= 0.92;
      this.vy *= 0.92;

      // Wrap around
      if (this.y > canvas.height + 10) this.init(false);
      if (this.x > canvas.width + 30) this.x = -20;
      if (this.x < -30) this.x = canvas.width + 20;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.fill();
    }
  }

  // Initialize flakes
  for (let i = 0; i < FLAKE_COUNT; i++) {
    flakes.push(new Snowflake());
  }

  // Animation loop
  let animId;
  let t = 0;

  function animate() {
    t++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Only render when cover is visible
    if (current === 0) {
      for (let i = 0; i < flakes.length; i++) {
        flakes[i].update(t);
        flakes[i].draw();
      }

      // Mouse glow aura
      if (mouseActive && mouseX > 0 && mouseY > 0) {
        const glow = ctx.createRadialGradient(
          mouseX, mouseY, 0,
          mouseX, mouseY, MOUSE_RADIUS
        );
        glow.addColorStop(0, 'rgba(200, 230, 255, 0.25)');
        glow.addColorStop(0.35, 'rgba(170, 210, 255, 0.12)');
        glow.addColorStop(0.7, 'rgba(150, 200, 255, 0.04)');
        glow.addColorStop(1, 'rgba(150, 200, 255, 0)');
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, MOUSE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
    }

    animId = requestAnimationFrame(animate);
  }

  animate();
})();

/* ========================================================
   COUVERTURE — LES PUPILLES DES MASCOTTES SUIVENT LA SOURIS
   ======================================================== */
(function() {
  // Un groupe par mascotte : boîte, unités du viewBox, amplitude et yeux
  const groups = [
    {
      box: document.getElementById('mascotMorad'),
      vw: 940, maxX: 30, maxY: 66,
      eyes: [
        { el: document.getElementById('moradL'), cx: 345, cy: 582 },
        { el: document.getElementById('moradR'), cx: 598, cy: 583 }
      ]
    },
    {
      box: document.getElementById('mascotOthman'),
      vw: 910, maxX: 32, maxY: 50,
      eyes: [
        { el: document.getElementById('othmanL'), cx: 297, cy: 527 },
        { el: document.getElementById('othmanR'), cx: 604, cy: 527 }
      ]
    }
  ].filter(g => g.box && g.eyes.every(e => e.el));

  if (!groups.length) return;

  groups.forEach(g => { g.curX = 0; g.curY = 0; g.targetX = 0; g.targetY = 0; });
  let raf = null;

  function apply(g) {
    g.eyes.forEach(e => {
      e.el.setAttribute('transform',
        `translate(${(e.cx + g.curX).toFixed(2)} ${(e.cy + g.curY).toFixed(2)})`);
    });
  }

  function setTargets(clientX, clientY) {
    groups.forEach(g => {
      const rect = g.box.getBoundingClientRect();
      if (!rect.width) return;
      const scale = rect.width / g.vw; // px par unité de viewBox

      // Centre des deux yeux de cette mascotte, en coordonnées écran
      const eyeX = rect.left + ((g.eyes[0].cx + g.eyes[1].cx) / 2) * scale;
      const eyeY = rect.top + ((g.eyes[0].cy + g.eyes[1].cy) / 2) * scale;

      const dx = (clientX - eyeX) / (window.innerWidth / 2);
      const dy = (clientY - eyeY) / (window.innerHeight / 2);

      g.targetX = Math.max(-1, Math.min(1, dx)) * g.maxX;
      g.targetY = Math.max(-1, Math.min(1, dy)) * g.maxY;

      // Premier pas immédiat, puis lissage par requestAnimationFrame
      g.curX += (g.targetX - g.curX) * 0.35;
      g.curY += (g.targetY - g.curY) * 0.35;
      apply(g);
    });
    start();
  }

  function frame() {
    let moving = false;
    groups.forEach(g => {
      // Amortissement : mouvement léger, jamais brusque
      g.curX += (g.targetX - g.curX) * 0.12;
      g.curY += (g.targetY - g.curY) * 0.12;
      apply(g);
      if (Math.abs(g.targetX - g.curX) > 0.05 || Math.abs(g.targetY - g.curY) > 0.05) moving = true;
    });
    raf = moving ? requestAnimationFrame(frame) : null;
  }

  function start() {
    if (raf === null) raf = requestAnimationFrame(frame);
  }

  document.addEventListener('mousemove', (e) => setTargets(e.clientX, e.clientY));
  document.addEventListener('mouseleave', () => {
    groups.forEach(g => { g.targetX = 0; g.targetY = 0; });
    start();
  });
})();
