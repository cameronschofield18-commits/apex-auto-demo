import * as THREE from 'https://esm.sh/three@0.160.0';

// Hero car is a procedural sports-car silhouette rendered as a holographic schematic.
// (No external model: avoids licensing + asset-mismatch risk; wireframe is on-concept.)

function buildCar() {
  const car = new THREE.Group();
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.9 });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x7ec8e6, wireframe: true, transparent: true, opacity: 0.16 });

  // side-profile coupe silhouette (x: length, y: height)
  const s = new THREE.Shape();
  const pts = [
    [-2.05, 0.20], [-2.10, 0.40], [-1.55, 0.50], [-0.85, 0.55],
    [-0.30, 0.92], [0.55, 0.95], [1.15, 0.66], [1.80, 0.60],
    [2.08, 0.50], [2.05, 0.20]
  ];
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.lineTo(pts[0][0], pts[0][1]);

  const depth = 1.7;
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1, steps: 1 });
  geo.translate(0, 0, -depth / 2);
  car.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edgeMat));
  car.add(new THREE.Mesh(geo, wireMat));

  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18);
  const wheelEdges = new THREE.EdgesGeometry(wheelGeo);
  [[-1.25, 0.85], [-1.25, -0.85], [1.30, 0.85], [1.30, -0.85]].forEach(([x, z]) => {
    const w = new THREE.LineSegments(wheelEdges, edgeMat);
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.30, z); car.add(w);
  });

  car.position.y = 0.45;
  return car;
}

export function initHero3D(canvas, reduce) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0.2, 1.35, 6.2);
  camera.lookAt(0, 0.95, 0);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const car = buildCar();
  scene.add(car);

  // sweeping scan line
  const scan = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 0.03),
    new THREE.MeshBasicMaterial({ color: 0xe25d5d, transparent: true, opacity: 0.6 })
  );
  scene.add(scan);

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);

  const state = { scroll: 0 };
  const t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    car.rotation.y = reduce ? -0.55 : (-0.55 + t * 0.16 + state.scroll * Math.PI);
    scan.position.y = 0.9 + Math.sin(t * 1.1) * 0.55;
    scan.material.opacity = 0.6 * (0.55 + 0.45 * Math.sin(t * 1.1));
    renderer.render(scene, camera);
    if (!reduce) requestAnimationFrame(frame);
  }
  if (reduce) { resize(); renderer.render(scene, camera); } else { requestAnimationFrame(frame); }
  return state;
}
