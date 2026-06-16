import * as THREE from 'https://esm.sh/three@0.160.0';

export function initHero3D(canvas, reduce) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 1.1, 6.2);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // holographic material: ice-blue wireframe
  const holo = new THREE.MeshBasicMaterial({ color: 0x7ec8e6, wireframe: true, transparent: true, opacity: 0.55 });
  const car = new THREE.Group();

  // procedural low-poly car from primitives (baseline; replaced by glb in Task 4)
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 1.4), holo); body.position.y = 0.55; car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.25), holo); cabin.position.set(-0.1, 1.05, 0); car.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16);
  [[1.0, 0.7], [1.0, -0.7], [-1.0, 0.7], [-1.0, -0.7]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, holo); w.rotation.x = Math.PI / 2; w.position.set(x, 0.42, z); car.add(w);
  });
  scene.add(car);

  // scan line plane
  const scanMat = new THREE.MeshBasicMaterial({ color: 0xe25d5d, transparent: true, opacity: 0.5 });
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.04), scanMat);
  scan.position.y = 0.3; scene.add(scan);

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);

  const state = { scroll: 0 };
  let t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    car.rotation.y = reduce ? -0.5 : (-0.5 + t * 0.18 + state.scroll * Math.PI);
    scan.position.y = 0.3 + Math.sin(t * 1.2) * 0.85;
    scan.material.opacity = 0.5 * (0.6 + 0.4 * Math.sin(t * 1.2));
    renderer.render(scene, camera);
    if (!reduce) requestAnimationFrame(frame);
  }
  if (reduce) { resize(); renderer.render(scene, camera); } else { requestAnimationFrame(frame); }
  return state;
}
