import Lenis from 'https://esm.sh/lenis@1.1.13';
import gsap from 'https://esm.sh/gsap@3.12.5';
import ScrollTrigger from 'https://esm.sh/gsap@3.12.5/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce) {
  const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

window.addEventListener('load', () => {
  gsap.utils.toArray('#grid .vcard, [data-reveal]').forEach((el, i) => {
    if (reduce) { el.style.opacity = 1; return; }
    gsap.fromTo(el, { y: 24, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: (i % 6) * 0.05, immediateRender: false,
      scrollTrigger: { trigger: el, start: 'top 92%' }
    });
  });
});
