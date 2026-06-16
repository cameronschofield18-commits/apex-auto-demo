import Lenis from 'https://esm.sh/lenis@1.1.13';
import gsap from 'https://esm.sh/gsap@3.12.5';
import ScrollTrigger from 'https://esm.sh/gsap@3.12.5/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// smooth scroll (skip under reduced-motion)
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// basic reveal for anything marked data-reveal
gsap.utils.toArray('[data-reveal]').forEach(el => {
  if (reduce) { el.style.opacity = 1; return; }
  gsap.fromTo(el, { y: 28, opacity: 0 }, {
    y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 85%' }
  });
});

// ignition boot
const boot = document.getElementById('boot');
if (boot && !reduce) {
  const bar = boot.querySelector('.boot-bar span');
  gsap.timeline()
    .to(bar, { width: '100%', duration: 1.1, ease: 'power2.inOut' })
    .to(boot, { opacity: 0, duration: 0.5, onComplete: () => boot.classList.add('done') }, '+=0.15');
} else if (boot) {
  boot.classList.add('done');
}

// holographic hero
import { initHero3D } from './hero3d.js';
const heroCanvas = document.getElementById('hero-canvas');
let heroState = null;
if (heroCanvas) heroState = initHero3D(heroCanvas, reduce);

// scroll choreography
if (heroState && !reduce) {
  ScrollTrigger.create({
    trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: self => { heroState.scroll = self.progress; }
  });
  const clusterSection = document.getElementById('cluster-section');
  if (clusterSection) {
    gsap.timeline({ scrollTrigger: { trigger: clusterSection, start: 'top 72%' } })
      .from('.gauge-col', { scale: 0.85, opacity: 0, duration: 0.7, ease: 'power3.out' })
      .from('#scr-browse', { x: -30, opacity: 0, duration: 0.6 }, '-=0.4')
      .from('#scr-comms', { x: 30, opacity: 0, duration: 0.6 }, '-=0.6');
  }
}

// hover-tilt on featured cards (after app.js populates them)
window.addEventListener('load', () => {
  if (reduce) return;
  document.querySelectorAll('#featured .vcard').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
      card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
});

export { gsap, ScrollTrigger, lenis, reduce, heroState };
