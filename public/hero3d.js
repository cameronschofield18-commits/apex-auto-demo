import * as THREE from 'https://esm.sh/three@0.160.0';
import { EffectComposer } from 'https://esm.sh/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://esm.sh/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://esm.sh/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';

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
  scene.fog = new THREE.FogExp2(0x050507, 0.09);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  camera.position.set(0.2, 1.35, 6.2);
  camera.lookAt(0, 0.95, 0);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const car = buildCar();
  scene.add(car);

  // receding grid floor (fades into fog for depth)
  const grid = new THREE.GridHelper(90, 90, 0xd64545, 0x244055);
  grid.material.transparent = true; grid.material.opacity = 0.55;
  grid.position.y = -0.55;
  scene.add(grid);

  // bloom post-processing so the holographic lines emit light
  let composer = null;
  function buildComposer(w, h) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.95, 0.5, 0.0));
    composer.setSize(w, h);
  }

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
    buildComposer(r.width, r.height);
  }
  resize(); window.addEventListener('resize', resize);

  // mouse parallax
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduce) window.addEventListener('mousemove', e => {
    mouse.tx = e.clientX / window.innerWidth - 0.5;
    mouse.ty = e.clientY / window.innerHeight - 0.5;
  });

  const state = { scroll: 0 };
  const t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;

    // materialize-on intro: lines fade + car scales up over ~1.4s
    const ease = 1 - Math.pow(1 - Math.min(t / 1.4, 1), 3);
    car.children.forEach(c => {
      const base = c.material.userData.base ?? (c.material.userData.base = c.material.opacity);
      c.material.opacity = base * ease;
    });
    car.scale.setScalar(0.9 + 0.1 * ease);

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    car.rotation.y = -0.55 + t * 0.14 + state.scroll * Math.PI + mouse.x * 0.45;
    car.rotation.x = mouse.y * 0.10;
    camera.position.x = 0.2 + mouse.x * 0.5;
    camera.lookAt(0, 0.95, 0);

    scan.position.y = 0.9 + Math.sin(t * 1.1) * 0.55;
    scan.material.opacity = 0.6 * (0.55 + 0.45 * Math.sin(t * 1.1));
    (composer || renderer).render(scene, camera);
    if (!reduce) requestAnimationFrame(frame);
  }
  if (reduce) {
    car.scale.setScalar(1); car.rotation.y = -0.55;
    resize(); (composer || renderer).render(scene, camera);
  } else requestAnimationFrame(frame);
  return state;
}
