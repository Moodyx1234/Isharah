/* ═══════════════════════════════════════════════════════
   إشارة — Shared JavaScript v1.0
   ═══════════════════════════════════════════════════════ */

// ── Navbar scroll glass effect ──────────────────────────
const _nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  _nav && _nav.classList.toggle('stuck', window.scrollY > 50);
}, { passive: true });

// ── Mobile menu toggle ───────────────────────────────────
function toggleMenu() {
  document.getElementById('mobile-menu')?.classList.toggle('open');
}

// ── Active nav link ──────────────────────────────────────
(() => {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href && (href.endsWith(page) || (page === '' && href.endsWith('index.html')))) {
      a.classList.add('active');
    }
  });
})();

// ── Scroll reveal ────────────────────────────────────────
(() => {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();

// ── Count-up animation ───────────────────────────────────
document.querySelectorAll('[data-count]').forEach(el => {
  const to  = parseFloat(el.dataset.count);
  const dec = parseInt(el.dataset.dec  || '0');
  const pre = el.dataset.pre || '';
  const suf = el.dataset.suf || '';
  const io  = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    const STEPS = 72, DUR = 2000;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      const eased = 1 - Math.pow(1 - i / STEPS, 3);
      el.textContent = pre + (to * eased).toFixed(dec) + suf;
      if (i >= STEPS) { el.textContent = pre + to.toFixed(dec) + suf; clearInterval(timer); }
    }, DUR / STEPS);
  }, { threshold: 0.5 });
  io.observe(el);
});

// ── FAQ accordion ────────────────────────────────────────
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const item    = q.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// ── Demo simulation ──────────────────────────────────────
function simDemo() {
  const btn  = document.getElementById('demo-btn');
  const spin = document.getElementById('demo-spin');
  const res  = document.getElementById('demo-result');
  if (!btn || !spin || !res) return;
  btn.disabled   = true;
  btn.textContent = 'جارٍ التحليل...';
  spin.style.display = 'block';
  res.classList.remove('show');
  setTimeout(() => {
    spin.style.display = 'none';
    res.classList.add('show');
    btn.disabled    = false;
    btn.textContent = 'جرّب مجدداً ↺';
  }, 2600);
}

// ── Contact form ─────────────────────────────────────────
document.getElementById('contact-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const btn  = e.target.querySelector('[type=submit]');
  const orig = btn.textContent;
  btn.textContent   = '✓ تم الإرسال بنجاح!';
  btn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
  setTimeout(() => {
    btn.textContent      = orig;
    btn.style.background = '';
    e.target.reset();
  }, 3200);
});
