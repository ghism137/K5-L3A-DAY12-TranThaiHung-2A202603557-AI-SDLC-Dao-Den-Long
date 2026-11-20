// Dựng và vẽ thế giới 3D (Three.js). Chỉ ĐỌC trạng thái từ src/core, không đổi luật chơi.
import * as THREE from "three";
import { PAL, palFor, ambientIntensity } from "./palette.js";
import { TPS, windAt } from "../core/sim.js";

const lerp = (a, b, k) => a + (b - a) * k;
const rad = (d) => (d * Math.PI) / 180;
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
const lambert = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
const at = (obj, x, y, z) => (obj.position.set(x, y, z), obj);

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.4, "rgba(255,255,255,0.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createWorld() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const dprCap = Number(new URLSearchParams(location.search).get("dpr") ?? 1.5);
  renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
  renderer.setSize(innerWidth, innerHeight);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.sky);
  scene.fog = new THREE.FogExp2(PAL.mist, 0.011);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
  addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });

  const ambient = new THREE.AmbientLight(0xffffff, ambientIntensity(0, 1));
  scene.add(ambient);
  const glowTex = glowTexture();
  let pal = PAL;
  const edgeMats = new Set(); // vật liệu viền/mắt Bóng Mực: đổi màu khi bật chế độ mù màu
  const beams = []; // tia hút dầu của Bóng Mực đang drain

  // sao + biển mây (cố định cho mọi Đêm)
  const starPos = [];
  for (let i = 0; i < 300; i++) {
    const a = i * 2.399963;
    const r = 180 + ((i * 37) % 80);
    starPos.push(Math.sin(a) * r, 40 + ((i * 53) % 110), Math.cos(a) * r);
  }
  scene.add(new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3)), new THREE.PointsMaterial({ color: PAL.text, size: 1.5, fog: false })));
  const sea = new THREE.Mesh(new THREE.CircleGeometry(420, 48), basic(PAL.cloudSea));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -7;
  scene.add(sea);

  // Mây: áo, khăn đỏ, nón lá, đèn lồng nhỏ
  const player = new THREE.Group();
  player.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 1, 14), lambert(PAL.robe)), 0, 0.55, 0));
  player.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 16), lambert(PAL.scarf)), 0, 1.05, 0));
  player.children.at(-1).rotation.x = Math.PI / 2;
  player.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), lambert(0xf2c9a0)), 0, 1.3, 0));
  player.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.5, 20), lambert(PAL.sand)), 0, 1.72, 0));
  const handLamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), basic(PAL.lanternLit));
  handLamp.position.set(0.55, 0.9, 0.1);
  player.add(handLamp);
  const playerLight = new THREE.PointLight(PAL.lanternLit, 22, 14, 1.6);
  playerLight.position.copy(handLamp.position);
  player.add(playerLight);
  scene.add(player);

  const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 56), basic(PAL.gold, { transparent: true, opacity: 0, side: THREE.DoubleSide, fog: false }));
  pulseRing.rotation.x = -Math.PI / 2;
  scene.add(pulseRing);
  let pulseT = 1;

  // đèn điểm cho các đèn lồng sáng: số lượng cố định (tránh biên dịch lại shader), gán cho đèn sáng gần nhất
  const lanternLights = Array.from({ length: 4 }, () => {
    const l = new THREE.PointLight(PAL.lanternLit, 0, 45, 1.5);
    scene.add(l);
    return l;
  });

  // lá gió
  const LEAVES = 70;
  const leafPos = new Float32Array(LEAVES * 3);
  for (let i = 0; i < LEAVES; i++) {
    leafPos[i * 3] = ((i * 53) % 50) - 25;
    leafPos[i * 3 + 1] = 0.5 + ((i * 17) % 9);
    leafPos[i * 3 + 2] = ((i * 91) % 50) - 25;
  }
  const leaves = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(leafPos, 3)), new THREE.PointsMaterial({ color: PAL.sand, size: 0.5, transparent: true, opacity: 0, fog: false }));
  leaves.frustumCulled = false;
  scene.add(leaves);

  let levelGroup = null;
  let lanternMeshes = new Map();
  let charmMeshes = new Map();
  const drifterMeshes = new Map();
  let level = null;
  const camPos = new THREE.Vector3();
  const wantCam = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const FOG_A = new THREE.Color(PAL.mist);
  let hudCamReady = false;

  function load(game) {
    if (levelGroup) scene.remove(levelGroup);
    for (const m of drifterMeshes.values()) scene.remove(m);
    drifterMeshes.clear();
    level = game.level;
    levelGroup = new THREE.Group();
    lanternMeshes = new Map();
    charmMeshes = new Map();
    const tuning = game.tuning;

    for (const s of level.surfaces) {
      if (s.type === "disk") {
        const depth = s.h + 3;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * 0.78, depth, 56), lambert(PAL.grass));
        body.position.set(s.cx, s.h - depth / 2, s.cz);
        levelGroup.add(body);
        const beach = new THREE.Mesh(new THREE.RingGeometry(Math.max(0.1, s.r - 1.4), s.r, 56), lambert(PAL.sand, { side: THREE.DoubleSide }));
        beach.rotation.x = -Math.PI / 2;
        beach.position.set(s.cx, s.h + 0.03, s.cz);
        levelGroup.add(beach);
      } else if (s.type === "ring") {
        const shape = new THREE.Shape();
        shape.absarc(0, 0, s.r1, 0, Math.PI, false);
        shape.lineTo(-s.r0, 0);
        shape.absarc(0, 0, s.r0, Math.PI, 0, true);
        shape.lineTo(s.r1, 0);
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: s.h, bevelEnabled: false, curveSegments: 40 }), lambert(PAL.grass));
        m.rotation.x = Math.PI / 2; // y của shape -> +z thế giới, bề dày đi xuống từ y = h
        m.position.set(s.cx, s.h, s.cz);
        levelGroup.add(m);
      } else if (s.type === "rect") {
        const m = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0, 0.35, s.z1 - s.z0), lambert(PAL.wood));
        m.position.set((s.x0 + s.x1) / 2, s.h - 0.175, (s.z0 + s.z1) / 2);
        levelGroup.add(m);
        for (let x = s.x0 + 0.5; x < s.x1; x += 1) {
          const plank = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, s.z1 - s.z0), lambert(0x000000));
          plank.position.set(x, s.h + 0.01, (s.z0 + s.z1) / 2);
          levelGroup.add(plank);
        }
      } else if (s.type === "ramp") {
        const len = s.rFoot - s.rTop;
        const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(len, 0), new THREE.Vector2(0, s.hTop - s.hFoot)]);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: s.halfWidth * 2, bevelEnabled: false });
        geo.translate(0, 0, -s.halfWidth);
        const m = new THREE.Mesh(geo, lambert(PAL.sand));
        m.rotation.y = -rad(s.angleDeg);
        m.position.set(s.rTop * Math.cos(rad(s.angleDeg)), s.hFoot, s.rTop * Math.sin(rad(s.angleDeg)));
        levelGroup.add(m);
      }
    }
    for (const t of level.towers) {
      const h = t.y1 - t.y0;
      levelGroup.add(at(new THREE.Mesh(new THREE.CylinderGeometry(t.r, t.r * 1.1, h, 24), lambert(PAL.wood)), t.x, t.y0 + h / 2, t.z));
      levelGroup.add(at(new THREE.Mesh(new THREE.ConeGeometry(t.r * 1.4, 2.2, 24), lambert(PAL.sand)), t.x, t.y1 + 1.1, t.z));
      levelGroup.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), basic(PAL.gold)), t.x, t.y1 - 1.2, t.z));
    }
    for (const p of level.pads) {
      levelGroup.add(at(new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, 0.12, 24), basic(PAL.gold)), p.x, p.y + 0.06, p.z));
      const inner = at(new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.7, p.r * 0.7, 0.14, 24), basic(PAL.scarf)), p.x, p.y + 0.07, p.z);
      levelGroup.add(inner);
      const dl = Math.hypot(p.dir[0], p.dir[1]);
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 10), basic(PAL.gold));
      arrow.position.set(p.x + (p.dir[0] / dl) * 1.9, p.y + 0.5, p.z + (p.dir[1] / dl) * 1.9);
      arrow.rotation.z = -Math.PI / 2;
      arrow.rotation.y = -Math.atan2(p.dir[1], p.dir[0]);
      levelGroup.add(arrow);
    }
    for (const l of game.lanterns) {
      const g = new THREE.Group();
      g.position.set(l.x, l.y, l.z);
      g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 3, 8), lambert(PAL.wood)), 0, 1.5, 0));
      const lamp = at(new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 14), basic(PAL.lanternOff)), 0, 3.5, 0);
      const core = at(new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), basic(PAL.lanternCore)), 0, 3.5, 0);
      core.visible = false;
      const halo = at(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: PAL.lanternLit, transparent: true, opacity: 0, depthWrite: false, fog: false })), 0, 3.5, 0);
      halo.scale.setScalar(6);
      const zone = new THREE.Mesh(new THREE.RingGeometry(tuning.safe_radius - 0.16, tuning.safe_radius, 72), basic(PAL.gold, { transparent: true, opacity: 0, side: THREE.DoubleSide, fog: false }));
      zone.rotation.x = -Math.PI / 2;
      zone.position.y = 0.06;
      g.add(lamp, core, halo, zone);
      // thanh dầu trên đèn đang sáng + vết rách giấy trên đèn tắt (phân biệt không cần màu)
      const barBg = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.42), basic(0x000000, { transparent: true, opacity: 0.6, fog: false, depthTest: false }));
      const barFill = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.3), basic(pal.gold, { fog: false, depthTest: false }));
      const bar = new THREE.Group();
      bar.add(barBg, barFill);
      bar.position.y = 4.7;
      bar.visible = false;
      bar.renderOrder = 10;
      const torn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 3), basic(0x15151c));
      torn.position.set(0.4, 3.5, 0.5);
      torn.rotation.z = 0.7;
      torn.visible = false;
      g.add(bar, torn);
      levelGroup.add(g);
      lanternMeshes.set(l.id, { group: g, lamp, core, halo, zone, bar, barFill, torn });
    }
    for (const c of game.charms) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.2, 0.04), basic(PAL.gold)));
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.04, 0.06), basic(PAL.scarf));
      g.add(card);
      g.position.set(c.x, c.y + 1.2, c.z);
      levelGroup.add(g);
      charmMeshes.set(c.id, g);
    }
    scene.add(levelGroup);
    hudCamReady = false;
  }

  // ---- Đom đóm: toàn bộ trong MỘT lần vẽ (THREE.Points + shader: lõi sáng + quầng, cộng sáng) ----
  const MOTE_CAP = 512;
  const motePos = new Float32Array(MOTE_CAP * 3);
  const moteSize = new Float32Array(MOTE_CAP);
  const moteAlpha = new Float32Array(MOTE_CAP).fill(0.9);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3).setUsage(THREE.DynamicDrawUsage));
  moteGeo.setAttribute("aSize", new THREE.BufferAttribute(moteSize, 1).setUsage(THREE.DynamicDrawUsage));
  moteGeo.setAttribute("aAlpha", new THREE.BufferAttribute(moteAlpha, 1));
  moteGeo.setDrawRange(0, 0);
  const moteMat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 700 }, uCore: { value: new THREE.Color(PAL.moteCore) }, uHalo: { value: new THREE.Color(PAL.moteHalo) } },
    vertexShader: `attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vAlpha;
      void main() { vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCore; uniform vec3 uHalo; varying float vAlpha;
      void main() { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
        float core = smoothstep(0.26, 0.18, d); float halo = exp(-d * d * 2.6) * 0.95;
        gl_FragColor = vec4(mix(uHalo, uCore, core), min(1.0, core + halo) * vAlpha); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const motePoints = new THREE.Points(moteGeo, moteMat);
  motePoints.frustumCulled = false;
  scene.add(motePoints);

  // ---- Bóng Mực: 3 lần vẽ cho mọi con (thân, viền, mắt) bằng InstancedMesh ----
  const SHADE_CAP = 512;
  const shadeBodyGeo = new THREE.SphereGeometry(0.78, 14, 10);
  const shadeBody = new THREE.InstancedMesh(shadeBodyGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), SHADE_CAP);
  const outlineMat = basic(pal.shadeEdge, { side: THREE.BackSide });
  const eyeMat = basic(pal.shadeEdge);
  edgeMats.add(outlineMat);
  edgeMats.add(eyeMat);
  const shadeOutline = new THREE.InstancedMesh(shadeBodyGeo, outlineMat, SHADE_CAP);
  const shadeEyes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat, SHADE_CAP * 2);
  const colBody = new THREE.Color(PAL.shadeBody);
  const colStun = new THREE.Color(PAL.shadeStunned);
  shadeBody.setColorAt(0, colBody);
  for (const m of [shadeBody, shadeOutline, shadeEyes]) {
    m.count = 0;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(m);
  }
  const dummy = new THREE.Object3D();
  const shadePos = new Float32Array(SHADE_CAP * 3); // vị trí thế giới của từng Bóng Mực trong khung hình này (cho tia hút dầu)
  const makeDrifter = () => {
    const geo = new THREE.PlaneGeometry(2.8, 0.6, 14, 1);
    const m = new THREE.Mesh(geo, basic(PAL.drifter, { side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    const g = new THREE.Group();
    g.add(m);
    g.userData = { geo, base: Float32Array.from(geo.attributes.position.array) };
    return g;
  };

  function syncPool(map, items, make) {
    const seen = new Set();
    for (const it of items) {
      seen.add(it.id);
      let m = map.get(it.id);
      if (!m) {
        m = make(it);
        scene.add(m);
        map.set(it.id, m);
      }
      m.userData.item = it;
    }
    for (const [k, m] of map) if (!seen.has(k)) (scene.remove(m), map.delete(k));
  }

  const proj = new THREE.Vector3();
  function project(x, y, z) {
    proj.set(x, y, z).project(camera);
    return { x: (proj.x * 0.5 + 0.5) * innerWidth, y: (-proj.y * 0.5 + 0.5) * innerHeight, behind: proj.z > 1 };
  }

  function pulseFlash() {
    pulseT = 0;
  }

  function draw(game, prev, alpha, t, dt, camYaw, shake, camOverride = null) {
    const p = game.player;
    const tu = game.tuning;
    const px = lerp(prev.x, p.x, alpha), py = lerp(prev.y, p.y, alpha), pz = lerp(prev.z, p.z, alpha);
    player.position.set(px, py, pz);
    if (p.fx || p.fz) player.rotation.y = Math.atan2(p.fx, p.fz);
    player.visible = p.invuln === 0 || Math.floor(t * 12) % 2 === 0;
    playerLight.intensity = 20 + Math.sin(t * 6) * 3 + (p.charm > 0 ? 6 : 0);
    handLamp.material.color.setHex(p.charm > 0 ? PAL.scarf : PAL.lanternLit);

    // đom đóm (Points)
    const mn = Math.min(game.motes.length, MOTE_CAP);
    for (let i = 0; i < mn; i++) {
      const it = game.motes[i];
      motePos[i * 3] = it.x;
      motePos[i * 3 + 1] = it.y + 0.9 + Math.sin(t * 2 + it.x) * 0.22;
      motePos[i * 3 + 2] = it.z;
      moteSize[i] = it.ttl !== null && it.ttl < 120 && Math.floor(t * 10) % 2 ? 0.4 : 1.3; // sắp biến mất thì nhấp nháy
    }
    moteGeo.attributes.position.needsUpdate = true;
    moteGeo.attributes.aSize.needsUpdate = true;
    moteGeo.setDrawRange(0, mn);
    moteMat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));

    // Bóng Mực (InstancedMesh)
    const sn = Math.min(game.shades.length, SHADE_CAP);
    for (let i = 0; i < sn; i++) {
      const s = game.shades[i];
      const ps = prev.shades.get(s.id) ?? s;
      const x = lerp(ps.x, s.x, alpha);
      const z = lerp(ps.z, s.z, alpha);
      const y = s.y + Math.sin(t * 3 + s.z) * 0.08;
      const sc = s.state === "spawning" ? 0.45 + 0.55 * (1 - s.spawning / 30) : s.state === "stunned" ? 0.85 : 1;
      const yaw = Math.atan2(px - x, pz - z); // quay mặt về phía Mây (cùng kết quả lookAt ngang)
      shadePos[i * 3] = x;
      shadePos[i * 3 + 1] = y;
      shadePos[i * 3 + 2] = z;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(sc, 1.25 * sc, sc);
      dummy.updateMatrix();
      shadeBody.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(1.13 * sc, 1.38 * sc, 1.13 * sc);
      dummy.updateMatrix();
      shadeOutline.setMatrixAt(i, dummy.matrix);
      shadeBody.setColorAt(i, s.state === "stunned" ? colStun : colBody);
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(sc);
      for (let k = 0; k < 2; k++) {
        const ex = (k === 0 ? -0.27 : 0.27) * sc;
        const ez = 0.68 * sc;
        dummy.position.set(x + ex * cy + ez * sy, y + 0.2 * sc, z - ex * sy + ez * cy);
        dummy.updateMatrix();
        shadeEyes.setMatrixAt(i * 2 + k, dummy.matrix);
      }
    }
    shadeBody.count = shadeOutline.count = sn;
    shadeEyes.count = sn * 2;
    shadeBody.instanceMatrix.needsUpdate = shadeOutline.instanceMatrix.needsUpdate = shadeEyes.instanceMatrix.needsUpdate = true;
    shadeBody.instanceColor.needsUpdate = true;

    syncPool(drifterMeshes, game.drifters, makeDrifter);
    for (const m of drifterMeshes.values()) {
      const d = m.userData.item;
      m.position.set(d.x, d.y, d.z);
      const arr = m.userData.geo.attributes.position.array;
      const base = m.userData.base;
      for (let i = 0; i < arr.length; i += 3) arr[i + 2] = Math.sin(t * 8 + base[i] * 2.2) * 0.35 * (0.4 + Math.abs(base[i]) / 1.4);
      m.userData.geo.attributes.position.needsUpdate = true;
      m.rotation.y = Math.atan2(p.x - d.x, p.z - d.z) + (d.state === "flee" ? Math.PI : 0) + Math.PI / 2;
      m.scale.setScalar(d.state === "flee" && d.stolen > 0 ? 1.15 : 1);
    }

    // tia hút dầu: Bóng Mực đang drain nối tới đèn
    let usedBeams = 0;
    for (let i = 0; i < sn; i++) {
      const s = game.shades[i];
      const ld = s.state === "drain" ? game.lanterns.find((x) => x.id === s.target) : null;
      if (!ld) continue;
      let b = beams[usedBeams++];
      if (!b) {
        b = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: pal.shadeEdge, fog: false }));
        b.frustumCulled = false;
        scene.add(b);
        beams.push(b);
      }
      const pos = b.geometry.attributes.position;
      pos.setXYZ(0, shadePos[i * 3], shadePos[i * 3 + 1], shadePos[i * 3 + 2]);
      pos.setXYZ(1, ld.x, ld.y + 3.5, ld.z);
      pos.needsUpdate = true;
      b.material.color.setHex(pal.shadeEdge);
      b.visible = true;
    }
    for (let i = usedBeams; i < beams.length; i++) beams[i].visible = false;

    // đèn lồng
    let lit = 0;
    const litList = [];
    for (const l of game.lanterns) {
      const m = lanternMeshes.get(l.id);
      if (l.lit) {
        lit++;
        litList.push(l);
      }
      const cost = l.everLit ? tu.relight_cost : tu.lantern_cost;
      const warm = l.lit ? 1 : l.deposited / cost;
      const maxU = tu.fuel_max * 60;
      const low = l.lit && l.fuel < tu.low_fuel_threshold * 60;
      const blink = !low || Math.floor(t * 2) % 2 === 0; // fuel < 30: đèn và thanh dầu nhấp nháy chậm 1 Hz
      m.lamp.material.color.setHex(l.lit ? PAL.lanternLit : warm > 0 ? 0x8c7a5a : PAL.lanternOff);
      m.lamp.scale.y = l.lit ? 1 : 0.8; // đèn tắt bị xẹp 20%
      m.torn.visible = !l.lit; // giấy có vết rách
      m.lamp.visible = blink;
      m.core.visible = l.lit && blink;
      m.core.scale.setScalar(1 + Math.sin(t * 5 + l.x) * 0.06);
      m.halo.material.opacity = l.lit && blink ? 0.25 + 0.5 * Math.max(0.2, l.fuel / maxU) : 0;
      m.zone.material.opacity = l.lit && !low ? 0.4 : 0; // fuel < 30 mất vùng an toàn
      const frac = Math.max(0, l.fuel / maxU);
      m.bar.visible = l.lit && blink;
      if (m.bar.visible) {
        m.barFill.scale.x = Math.max(0.001, frac);
        m.barFill.position.x = -(1 - frac) * 1.35;
        m.barFill.material.color.setHex(low ? pal.danger : pal.gold);
        m.bar.lookAt(camera.position);
      }
    }
    litList.sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz));
    lanternLights.forEach((light, i) => {
      const l = litList[i];
      if (l) {
        light.position.set(l.x, l.y + 3.6, l.z);
        light.intensity = 130;
      } else light.intensity = 0;
    });
    for (const c of game.charms) {
      const m = charmMeshes.get(c.id);
      if (!m) continue;
      m.visible = c.available;
      m.position.y = c.y + 1.2 + Math.sin(t * 2.5) * 0.15;
      m.rotation.y = t * 1.5;
    }
    ambient.intensity = ambientIntensity(lit, game.lanterns.length);

    // vòng Tỏa Sáng
    if (pulseT < 1) {
      pulseT += dt / 0.55;
      pulseRing.position.set(px, py + 0.1, pz);
      pulseRing.scale.setScalar(tu.pulse_radius * Math.min(1, pulseT) + 0.1);
      pulseRing.material.opacity = 0.8 * Math.max(0, 1 - pulseT);
    } else pulseRing.material.opacity = 0;

    // lá bay (báo gió trước 2 s, và khi gió thổi)
    const w = game.level.wind ? windAt(game.seed, game.sim) : null;
    const showLeaves = w && (w.active || w.warning);
    leaves.material.opacity = showLeaves ? 0.9 : 0;
    if (showLeaves) {
      const dx = Math.cos(rad(w.dir_deg));
      const dz = Math.sin(rad(w.dir_deg));
      const sp = w.active ? 14 : 5;
      const pos = leaves.geometry.attributes.position.array;
      for (let i = 0; i < LEAVES; i++) {
        pos[i * 3] += dx * sp * dt + Math.sin(t * 3 + i) * 0.02;
        pos[i * 3 + 2] += dz * sp * dt;
        pos[i * 3 + 1] += Math.sin(t * 2 + i) * 0.01;
        if (Math.abs(pos[i * 3]) > 25) pos[i * 3] *= -0.98;
        if (Math.abs(pos[i * 3 + 2]) > 25) pos[i * 3 + 2] *= -0.98;
      }
      leaves.geometry.attributes.position.needsUpdate = true;
      leaves.position.set(px, py, pz);
    }

    // camera ngôi thứ ba: vị trí = người chơi + (sinθ, cosθ) × d, khớp công thức xoay move của contract
    if (camOverride) {
      // camera cố định theo công thức (cảnh benchmark): không làm mượt, không rung
      camera.position.set(camOverride.x, camOverride.y, camOverride.z);
      camera.lookAt(camOverride.lookAt[0], camOverride.lookAt[1], camOverride.lookAt[2]);
    } else {
      const th = rad(camYaw);
      wantCam.set(px + Math.sin(th) * 10, py + 6.5, pz + Math.cos(th) * 10);
      if (!hudCamReady) {
        camPos.copy(wantCam);
        hudCamReady = true;
      }
      camPos.lerp(wantCam, 1 - Math.exp(-dt * 9)); // làm mượt theo thời gian thật, không phụ thuộc tần số quét
      camera.position.copy(camPos);
      if (shake > 0) camera.position.add(tmp.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0));
      camera.lookAt(px, py + 1.6, pz);
    }

    scene.fog.color.copy(FOG_A);
    renderer.render(scene, camera);
    return lit;
  }

  function setColorblind(on) {
    pal = palFor(on);
    for (const m of edgeMats) m.color.setHex(pal.shadeEdge);
  }

  return { renderer, camera, load, draw, project, pulseFlash, scene, setColorblind, palette: () => pal };
}
