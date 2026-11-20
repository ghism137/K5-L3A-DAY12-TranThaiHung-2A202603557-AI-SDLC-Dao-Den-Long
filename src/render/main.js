// Bản có giao diện (Three.js). Chỉ ĐỌC trạng thái từ src/core/sim.js, không đổi luật chơi.
// Hiệu ứng thêm (âm chuông WebAudio, sao đêm, bụi sáng) chỉ có ở đây, không ảnh hưởng headless.
import * as THREE from "three";
import { createGame, TPS, ISLAND_RADIUS } from "../core/sim.js";

const contract = await (await fetch("/game.contract.json")).json();
const tuning = contract.tuning;
const params = new URLSearchParams(location.search);

// ---------- cảnh ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x140d24);
scene.fog = new THREE.FogExp2(0x1a1030, 0.018);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

const ambient = new THREE.HemisphereLight(0x8a6bd1, 0x2a1d44, 0.6);
scene.add(ambient);

// đảo + biển mây + sao
const island = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS + 1.5, 3, 48), new THREE.MeshStandardMaterial({ color: 0x3b4a2f, roughness: 1 }));
island.position.y = -1.5;
scene.add(island);
const clouds = new THREE.Mesh(new THREE.CircleGeometry(300, 48), new THREE.MeshBasicMaterial({ color: 0x2a1f45 }));
clouds.rotation.x = -Math.PI / 2;
clouds.position.y = -4;
scene.add(clouds);
const starPos = [];
for (let i = 0; i < 300; i++) {
  const a = i * 2.399963; // góc vàng: rải đều, không cần Math.random
  const r = 140 + ((i * 37) % 60);
  starPos.push(Math.sin(a) * r, 25 + ((i * 53) % 90), Math.cos(a) * r);
}
const stars = new THREE.Points(
  new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3)),
  new THREE.PointsMaterial({ color: 0xfff1c9, size: 1.4, fog: false }),
);scene.add(stars);

const at = (mesh, x, y, z) => (mesh.position.set(x, y, z), mesh);
const mat = (c, e = 0, ei = 1) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: ei, roughness: 0.8 });

// người chơi: Mây, nón lá, đèn lồng nhỏ
const player = new THREE.Group();
player.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1, 12), mat(0x4f7cc7)), 0, 0.55, 0));
player.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 12), mat(0xf2c9a0)), 0, 1.3, 0));
player.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.5, 20), mat(0xe6cf8a)), 0, 1.75, 0));
const handLamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), mat(0xffb347, 0xffa42e, 2));
handLamp.position.set(0.55, 0.9, 0.1);
player.add(handLamp);
const playerLight = new THREE.PointLight(0xffb86b, 18, 14, 1.6);
playerLight.position.copy(handLamp.position);
player.add(playerLight);
scene.add(player);

// vòng pulse
const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, side: THREE.DoubleSide }));
pulseRing.rotation.x = -Math.PI / 2;
scene.add(pulseRing);
let pulseT = 1;

// ---------- trạng thái ----------
let game, lanternMeshes, moteMeshes, shadeMeshes, cam, shake, lastLit;
const moteGeo = new THREE.SphereGeometry(0.16, 10, 8);
const moteMat = new THREE.MeshBasicMaterial({ color: 0xffe27a });

function reset() {
  for (const m of [...(lanternMeshes?.values() ?? []), ...(moteMeshes?.values() ?? []), ...(shadeMeshes?.values() ?? [])]) scene.remove(m.group ?? m);
  const litN = Number(params.get("lit") ?? 0); // chỉ để chụp ảnh kiểm tra: ?lit=3 dựng sẵn 3 đèn sáng
  game = createGame({ tuning, seed: Number(params.get("seed") ?? Date.now() % 100000), scenario: litN ? { lanterns: Array.from({ length: litN }, (_, i) => ({ id: `L${i + 1}`, lit: true })) } : {} });
  camera.position.set(0, 6.5, 10);
  lanternMeshes = new Map();
  for (const l of game.lanterns) {
    const g = new THREE.Group();
    g.position.set(l.x, 0, l.z);
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 8), mat(0x5a4a3a)), 0, 1.5, 0));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), mat(0x3a2f55, 0x000000));
    lamp.position.y = 3.4;
    const light = new THREE.PointLight(0xffa94d, 0, 40, 1.4);
    light.position.y = 3.4;
    const zone = new THREE.Mesh(new THREE.RingGeometry(tuning.safe_radius - 0.15, tuning.safe_radius, 64), new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    zone.rotation.x = -Math.PI / 2;
    zone.position.y = 0.05;
    g.add(lamp, light, zone);
    scene.add(g);
    lanternMeshes.set(l.id, { group: g, lamp, light, zone });
  }
  moteMeshes = new Map();
  shadeMeshes = new Map();
  cam = cam ?? { yaw: 0 };
  shake = 0;
  lastLit = 0;
  document.getElementById("msg").style.display = "none";
  acc = 0;
}

// ---------- vào ra ----------
const keys = new Set();
const latch = { jump: false, interact: false, pulse: false };
addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  keys.add(k);
  if (k === " ") latch.jump = true;
  if (k === "e") latch.interact = true;
  if (k === "q" || k === "f") latch.pulse = true;
  if (k === "r") reset();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
  audio();
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
let drag = false;
renderer.domElement.addEventListener("pointerdown", () => (drag = true));
addEventListener("pointerup", () => (drag = false));
addEventListener("pointermove", (e) => {
  if (drag) cam.yaw -= e.movementX * 0.3;
});

function readInput() {
  const x = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const z = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
  const inp = {
    move: [x, z],
    cam_yaw_deg: cam.yaw,
    jump: latch.jump || keys.has(" "),
    interact: latch.interact || keys.has("e"),
    pulse: latch.pulse || keys.has("q") || keys.has("f"),
  };
  return inp;
}

// ---------- âm thanh (WebAudio, chỉ ở bản có giao diện) ----------
let ac;
function audio() {
  ac ??= new (window.AudioContext || window.webkitAudioContext)();
}
function tone(freq, dur = 0.4, type = "sine", vol = 0.12) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.connect(g).connect(ac.destination);
  o.start();
  o.stop(ac.currentTime + dur);
}
function onEvent(e) {
  if (e.name === "mote_picked") tone(880 + e.data.carried * 90, 0.15);
  if (e.name === "deposit") tone(520, 0.25, "triangle");
  if (e.name === "lantern_lit") [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.7, "sine", 0.14), i * 110));
  if (e.name === "pulse") {
    pulseT = 0;
    tone(330, 0.5, "sine", 0.16);
  }
  if (e.name === "player_hit") {
    shake = 0.5;
    tone(110, 0.4, "sawtooth", 0.14);
  }
}

// ---------- vòng lặp ----------
let acc = 0;
let prevT = performance.now();
const hud = document.getElementById("hud");
reset();

// Nội suy giữa 2 tick (sim 60 Hz, màn hình có thể 75/144 Hz): vẽ ở vị trí giữa tick trước và tick hiện tại
const prevPose = { x: 0, y: 0, z: 0, shades: new Map() };
function savePose() {
  const p = game.player;
  prevPose.x = p.x;
  prevPose.y = p.y;
  prevPose.z = p.z;
  prevPose.shades.clear();
  for (const s of game.shades) prevPose.shades.set(s.id, { x: s.x, z: s.z });
}
let dt = 1 / 60;

function frame(now) {
  dt = Math.min((now - prevT) / 1000, 0.25);
  acc += dt * TPS;
  prevT = now;
  if (game.stepsDone === 0) savePose();
  while (acc >= 1) {
    acc -= 1;
    if (game.state === "playing") {
      savePose();
      const inp = readInput();
      for (const e of game.step(inp)) onEvent(e);
      latch.jump = latch.interact = latch.pulse = false;
    }
  }
  draw(now / 1000, game.state === "playing" ? acc : 1);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function sync(map, items, make, key = (i) => i.id) {
  const seen = new Set();
  for (const it of items) {
    seen.add(key(it));
    let m = map.get(key(it));
    if (!m) {
      m = make(it);
      scene.add(m);
      map.set(key(it), m);
    }
    m.userData.item = it;
  }
  for (const [k, m] of map) if (!seen.has(k)) (scene.remove(m), map.delete(k));
}

function makeShade() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), new THREE.MeshStandardMaterial({ color: 0x2a1448, emissive: 0x120626, roughness: 1 }));
  body.scale.set(1, 1.25, 1);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd9b8ff });
  for (const sx of [-0.28, 0.28]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
    eye.position.set(sx, 0.2, 0.7);
    g.add(eye);
  }
  g.add(body);
  g.userData.body = body;
  return g;
}

const lerp = (a, b, k) => a + (b - a) * k;
const COL = { fogA: new THREE.Color(0x1a1030), fogB: new THREE.Color(0x5a3a42), bgA: new THREE.Color(0x140d24), bgB: new THREE.Color(0x3a2748) };
const wantCam = new THREE.Vector3();
let hudText = "";

function draw(t, alpha) {
  const p = game.player;
  const px = lerp(prevPose.x, p.x, alpha), py = lerp(prevPose.y, p.y, alpha), pz = lerp(prevPose.z, p.z, alpha);
  player.position.set(px, py, pz);
  player.rotation.y = Math.sin(t * 2) * 0.05;
  player.visible = p.invuln === 0 || Math.floor(t * 12) % 2 === 0;
  playerLight.intensity = 14 + Math.sin(t * 6) * 3;

  sync(moteMeshes, game.motes, () => new THREE.Mesh(moteGeo, moteMat));
  for (const m of moteMeshes.values()) {
    const it = m.userData.item;
    m.position.set(it.x, 0.9 + Math.sin(t * 2 + it.x) * 0.25, it.z);
  }
  sync(shadeMeshes, game.shades, makeShade);
  for (const m of shadeMeshes.values()) {
    const s = m.userData.item;
    const ps = prevPose.shades.get(s.id) ?? s;
    m.position.set(lerp(ps.x, s.x, alpha), 1.0 + Math.sin(t * 3 + s.z) * 0.08, lerp(ps.z, s.z, alpha));
    m.userData.body.material.emissive.setHex(s.state === "stunned" ? 0x3b4c8a : 0x120626);
    m.userData.body.material.color.setHex(s.state === "stunned" ? 0x6a78b8 : 0x2a1448);
    m.scale.setScalar(s.state === "stunned" ? 0.85 : 1);
    m.lookAt(px, 1, pz);
  }

  let lit = 0;
  for (const l of game.lanterns) {
    const m = lanternMeshes.get(l.id);
    if (l.lit) lit++;
    const warm = l.lit ? 1 : l.deposited / tuning.lantern_cost;
    m.lamp.material.color.setHex(l.lit ? 0xffd27a : 0x3a2f55);
    m.lamp.material.emissive.setHex(0xffa42e);
    m.lamp.material.emissiveIntensity = l.lit ? 2.5 + Math.sin(t * 5 + l.x) * 0.3 : 0.25 + warm * 0.9;
    m.light.intensity = l.lit ? 260 : 0;
    m.zone.material.opacity = l.lit ? 0.35 : 0;
  }
  const bright = lit / game.lanterns.length;
  ambient.intensity = 0.55 + bright * 0.9;
  scene.fog.color.lerpColors(COL.fogA, COL.fogB, bright);
  scene.background.lerpColors(COL.bgA, COL.bgB, bright);
  stars.material.opacity = 1;
  lastLit = lit;

  if (pulseT < 1) {
    pulseT += 0.03;
    pulseRing.position.set(px, 0.08, pz);
    pulseRing.scale.setScalar(tuning.pulse_radius * pulseT + 0.1);
    pulseRing.material.opacity = 0.7 * (1 - pulseT);
  } else pulseRing.material.opacity = 0;

  // camera ngôi thứ ba: vị trí = người chơi + (sinθ, cosθ) * d, khớp công thức xoay move của contract
  const th = (cam.yaw * Math.PI) / 180;
  shake = Math.max(0, shake - 0.02);
  wantCam.set(px + Math.sin(th) * 10, 6.5 + py * 0.3, pz + Math.cos(th) * 10);
  camera.position.lerp(wantCam, 1 - Math.exp(-dt * 9)); // làm mượt theo thời gian, không phụ thuộc tần số quét
  camera.position.x += (Math.random() - 0.5) * shake;
  camera.lookAt(px, 1.6 + py * 0.3, pz);

  const timeLeft = Math.max(0, game.remaining / TPS);
  const html =
    `🔥 Ngọn lửa: <b>${"●".repeat(Math.max(0, p.flames))}${"○".repeat(Math.max(0, tuning.flames - p.flames))}</b><br>` +
    `✨ Đom đóm: <b>${p.carried}/${tuning.carry_capacity}</b><br>` +
    `🏮 Đèn sáng: <b>${lit}/${game.lanterns.length}</b><br>` +
    `⏳ Còn lại: <b>${Math.floor(timeLeft / 60)}:${String(Math.floor(timeLeft % 60)).padStart(2, "0")}</b><br>` +
    `⭐ Điểm: <b>${game.score}</b>`;
  if (html !== hudText) {
    hudText = html; // chỉ chạm DOM khi nội dung đổi (tránh layout mỗi khung hình)
    hud.innerHTML = html;
  }

  if (game.state !== "playing") {
    const won = game.state === "won";
    document.getElementById("msg-title").textContent = won ? "Đảo đã sáng rực!" : "Sương đen đã nuốt đảo...";
    document.getElementById("msg-body").textContent = `Điểm: ${game.score}`;
    document.getElementById("msg").style.display = "flex";
  }
  renderer.render(scene, camera);
}
