/**
 * 3D çalışma odası. Site bu odayla açılır: masadaki nesnelere tıklanınca kamera o nesneye yaklaşır.
 *   Monitör   → projeler (ekranın içinde gerçek HTML arayüz)
 *   Telefon   → oyun seçme ekranı: Ocakbaşı ya da Okey Salonu telefonun ekranında oynanır
 *   Kitaplık  → yetenekler
 *   Diploma   → hakkımda
 *   Zarf      → iletişim
 *   Defter    → CV
 *   Fidan     → Çınar (sıfırdan eğitilmiş Türkçe dil modeli, deneysel proje)
 *   L masanın sol kanadı (laboratuvar köşesi):
 *     Radar konsolu → Radar Target Tracker
 *     Nucleo kartı  → gömülü telemetri
 *     Ağ anahtarı   → Taktik Mesaj Ağ Geçidi
 * Bütün modeller kodla kurulur, dışarıdan model dosyası yüklenmez.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "./assets/vendor/addons/RoundedBoxGeometry.js";
import { RoomEnvironment } from "./assets/vendor/addons/RoomEnvironment.js";

const kok = document.documentElement;
const azHareket = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s) => document.querySelector(s);

// ---------- Yardımcılar ----------

function webglVar() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const kutu = (w, h, d, r = 0.01) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (renk, o = {}) => new THREE.MeshStandardMaterial({ color: renk, roughness: 0.7, metalness: 0, ...o });

function mesh(geo, malzeme, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, malzeme);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Tuvale çizip doku yapar. */
function tuvalDokusu(w, h, ciz) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  ciz(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function resimYukle(src) {
  return new Promise((coz) => {
    const img = new Image();
    img.onload = () => coz(img);
    img.onerror = () => coz(null);
    img.src = src;
  });
}

const yumusak = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------- Sahne ----------

export async function odaBaslat({ kap, etiket, ipucu, geri, katmanlar, onOdak, onCikis }) {
  if (!webglVar()) return null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  kap.appendChild(renderer.domElement);

  const sahne = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  sahne.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  sahne.environmentIntensity = 0.35;

  const kamera = new THREE.PerspectiveCamera(40, 1, 0.05, 50);

  // ---- Işıklar ----
  const gokIsik = new THREE.HemisphereLight(0xcfd8ff, 0x2a1a10, 0.35);
  sahne.add(gokIsik);

  const lambaIsik = new THREE.SpotLight(0xffc27a, 9, 3.2, Math.PI / 3.2, 0.6, 1.6);
  lambaIsik.castShadow = true;
  lambaIsik.shadow.mapSize.set(1024, 1024);
  lambaIsik.shadow.bias = -0.0004;
  lambaIsik.shadow.radius = 4;
  sahne.add(lambaIsik, lambaIsik.target);

  const pencereIsik = new THREE.DirectionalLight(0x9db4ff, 0.6);
  pencereIsik.position.set(-2.2, 2.6, -0.2);
  pencereIsik.castShadow = true;
  pencereIsik.shadow.mapSize.set(1024, 1024);
  pencereIsik.shadow.camera.left = -2;
  pencereIsik.shadow.camera.right = 2;
  pencereIsik.shadow.camera.top = 2;
  pencereIsik.shadow.camera.bottom = -1;
  pencereIsik.shadow.bias = -0.0005;
  sahne.add(pencereIsik);

  const ekranIsik = new THREE.PointLight(0x7aa2ff, 0.9, 1.6, 2);
  ekranIsik.position.set(0, 1.05, 0.05);
  sahne.add(ekranIsik);

  // ---- Oda ----
  const duvarMat = mat(0x3b4152, { roughness: 0.95 });
  const zemin = mesh(new THREE.PlaneGeometry(8, 8), mat(0x4a3426, { roughness: 0.85 }));
  zemin.rotation.x = -Math.PI / 2;
  sahne.add(zemin);
  const arkaDuvar = mesh(new THREE.PlaneGeometry(8, 4), duvarMat, 0, 2, -0.6);
  sahne.add(arkaDuvar);
  const solDuvar = mesh(new THREE.PlaneGeometry(6, 4), duvarMat, -2.3, 2, 2.4);
  solDuvar.rotation.y = Math.PI / 2;
  sahne.add(solDuvar);
  // süpürgelik
  sahne.add(mesh(kutu(8, 0.08, 0.02, 0.004), mat(0x2b2f3b), 0, 0.04, -0.59));

  // halı
  const hali = mesh(new THREE.CircleGeometry(1.1, 48), mat(0x8c2f39, { roughness: 1 }), 0.1, 0.003, 0.6);
  hali.rotation.x = -Math.PI / 2;
  sahne.add(hali);

  // ---- Masa ----
  const ahsap = mat(0x9a6a43, { roughness: 0.55 });
  const MASA_Y = 0.75;
  // Tek parça L masa: iki kolu da aynı derinlikte; sol kol öne döner (laboratuvar köşesi), duvarlara yapışmaz
  const masaSekli = new THREE.Shape();
  for (const [i, [x, z]] of [[0.9, -0.425], [0.9, 0.425], [-1.0, 0.425], [-1.0, 1.3], [-1.85, 1.3], [-1.85, -0.425]].entries()) {
    if (i === 0) masaSekli.moveTo(x, -z); else masaSekli.lineTo(x, -z);
  }
  const masaGeo = new THREE.ExtrudeGeometry(masaSekli, { depth: 0.038, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3 });
  masaGeo.rotateX(-Math.PI / 2);
  sahne.add(mesh(masaGeo, ahsap, 0, MASA_Y - 0.044, 0));
  const ayakMat = mat(0x1f2229, { metalness: 0.6, roughness: 0.4 });
  for (const [x, z] of [[0.85, -0.37], [0.85, 0.37], [-1.8, -0.37], [-1.8, 1.25], [-1.05, 1.25]]) {
    sahne.add(mesh(kutu(0.045, MASA_Y - 0.05, 0.045, 0.008), ayakMat, x, (MASA_Y - 0.05) / 2, z));
  }
  // sağda çekmece dolabı
  sahne.add(mesh(kutu(0.42, 0.62, 0.7, 0.01), mat(0x7f5636), 0.6, 0.31, 0));
  for (const y of [0.18, 0.42]) {
    sahne.add(mesh(kutu(0.38, 0.2, 0.01, 0.004), mat(0x8d6040), 0.6, y, 0.355));
    sahne.add(mesh(kutu(0.12, 0.015, 0.02, 0.006), ayakMat, 0.6, y + 0.05, 0.365));
  }
  // masa altı sandalye
  const sandalye = new THREE.Group();
  const kumas = mat(0x22262f, { roughness: 0.9 });
  sandalye.add(mesh(kutu(0.5, 0.08, 0.48, 0.03), kumas, 0, 0.5, 0));
  sandalye.add(mesh(kutu(0.48, 0.45, 0.07, 0.03), kumas, 0, 0.78, 0.24));
  sandalye.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 12), ayakMat, 0, 0.25, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const k = mesh(kutu(0.3, 0.03, 0.04, 0.01), ayakMat, Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15);
    k.rotation.y = -a;
    sandalye.add(k);
  }
  sandalye.position.set(1.05, 0, 0.95);
  sandalye.rotation.y = -0.7;
  sahne.add(sandalye);

  // ---- Etkileşimli nesneler ----
  const etkilesimler = []; // { ad, grup, odak: {kamera, hedef}, ekran?: Mesh }

  // Monitör
  const monitor = new THREE.Group();
  const EKRAN_W = 0.64, EKRAN_H = 0.4;
  const kasa = mat(0x15171c, { roughness: 0.35, metalness: 0.3 });
  monitor.add(mesh(kutu(EKRAN_W + 0.03, EKRAN_H + 0.03, 0.025, 0.01), kasa, 0, 0, -0.012));
  monitor.add(mesh(kutu(0.05, 0.22, 0.03, 0.01), kasa, 0, -0.27, -0.04));
  monitor.add(mesh(kutu(0.24, 0.012, 0.16, 0.006), kasa, 0, -0.375, -0.02));
  const ekranMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const ekran = new THREE.Mesh(new THREE.PlaneGeometry(EKRAN_W, EKRAN_H), ekranMat);
  ekran.position.z = 0.0015;
  monitor.add(ekran);
  monitor.position.set(0, MASA_Y + 0.38, -0.2);
  sahne.add(monitor);

  // Klavye ve fare
  const klavye = new THREE.Group();
  klavye.add(mesh(kutu(0.44, 0.018, 0.14, 0.006), mat(0x1c1f26, { roughness: 0.5 })));
  const tusMat = mat(0x2c313b, { roughness: 0.6 });
  const tusGeo = kutu(0.022, 0.01, 0.022, 0.003);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 17; c++) {
    if (r === 4 && c > 4 && c < 12) continue;
    klavye.add(mesh(tusGeo, tusMat, -0.2 + c * 0.025, 0.012, -0.05 + r * 0.025));
  }
  klavye.add(mesh(kutu(0.17, 0.01, 0.022, 0.003), tusMat, 0, 0.012, 0.05));
  klavye.position.set(-0.02, MASA_Y + 0.01, 0.13);
  sahne.add(klavye);
  const fare = mesh(new THREE.SphereGeometry(0.03, 20, 12), mat(0x1c1f26, { roughness: 0.4 }), 0.33, MASA_Y + 0.01, 0.15);
  fare.scale.set(0.9, 0.45, 1.4);
  sahne.add(fare);
  const ped = mesh(kutu(0.26, 0.004, 0.22, 0.004), mat(0x2a9d8f, { roughness: 1 }), 0.33, MASA_Y + 0.002, 0.14);
  sahne.add(ped);

  // Lamba
  const lamba = new THREE.Group();
  const lambaMat = mat(0xd9a441, { metalness: 0.7, roughness: 0.35 });
  lamba.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 24), lambaMat, 0, 0.01, 0));
  const kol1 = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 8), lambaMat, 0.05, 0.18, 0);
  kol1.rotation.z = -0.3;
  lamba.add(kol1);
  const kol2 = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 8), lambaMat, 0.2, 0.39, 0);
  kol2.rotation.z = -1.25;
  lamba.add(kol2);
  const basHead = new THREE.Group();
  basHead.add(mesh(new THREE.ConeGeometry(0.075, 0.11, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide })));
  const ampul = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe2b0, toneMapped: false }));
  ampul.position.y = -0.04;
  basHead.add(ampul);
  basHead.position.set(0.34, 0.42, 0);
  basHead.rotation.z = -0.35;
  basHead.scale.setScalar(0.85);
  lamba.add(basHead);
  lamba.position.set(-0.78, MASA_Y, -0.24);
  sahne.add(lamba);
  lambaIsik.position.set(-0.78 + 0.34, MASA_Y + 0.38, -0.24);
  lambaIsik.target.position.set(-0.2, MASA_Y, 0.05);

  // Kupa ve buhar
  const kupa = new THREE.Group();
  const kupaMat = mat(0xf2ebe1, { roughness: 0.3 });
  kupa.add(mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.095, 24), kupaMat, 0, 0.0475, 0));
  const kahve = new THREE.Mesh(new THREE.CircleGeometry(0.034, 24), mat(0x3b2416, { roughness: 0.2 }));
  kahve.rotation.x = -Math.PI / 2;
  kahve.position.y = 0.088;
  kupa.add(kahve);
  const kulp = mesh(new THREE.TorusGeometry(0.024, 0.007, 8, 16, Math.PI), kupaMat, 0.04, 0.05, 0);
  kulp.rotation.z = -Math.PI / 2;
  kupa.add(kulp);
  kupa.position.set(-0.5, MASA_Y, 0.12);
  sahne.add(kupa);
  const buharDoku = tuvalDokusu(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,.55)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  });
  const buharlar = Array.from({ length: 8 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: buharDoku, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.faz = i / 8;
    sahne.add(s);
    return s;
  });

  // Saksıda çınar fidanı (Çınar dil modeli projesi): küçük ama büyüyen bir ağaç
  const fidan = new THREE.Group();
  fidan.add(mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.1, 20), mat(0xb5583a), 0, 0.05, 0));
  fidan.add(mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.006, 20), mat(0x3b2a1e, { roughness: 1 }), 0, 0.098, 0));
  const govdeMat = mat(0x7a5a3c, { roughness: 0.8 });
  const govde = mesh(new THREE.CylinderGeometry(0.004, 0.007, 0.2, 8), govdeMat, 0, 0.2, 0);
  fidan.add(govde);
  // Çınar yaprağı: beş loblu, el ayasına benzer şekil
  const yaprakSekil = new THREE.Shape();
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r = 0.024 * (0.4 + 0.6 * Math.pow(Math.abs(Math.cos(a * 2.5)), 2.5)) * (a > Math.PI * 1.35 && a < Math.PI * 1.65 ? 0.5 : 1);
    const x = Math.cos(a) * r, y = Math.sin(a) * r + 0.012;
    if (i === 0) yaprakSekil.moveTo(x, y); else yaprakSekil.lineTo(x, y);
  }
  const yaprakGeo = new THREE.ShapeGeometry(yaprakSekil);
  const yaprakMat = mat(0x4f9a43, { roughness: 0.6, side: THREE.DoubleSide });
  const yapraklar = [];
  const dallar = [[0.17, 0.6, 0.06], [0.21, 2.5, 0.05], [0.25, 4.3, 0.045], [0.29, 1.4, 0.035]];
  for (const [yuk, aci, boy] of dallar) {
    const dal = new THREE.Group();
    dal.position.y = yuk;
    dal.rotation.y = aci;
    const kol = mesh(new THREE.CylinderGeometry(0.002, 0.003, boy, 6), govdeMat, boy / 2 * 0.7, 0, 0);
    kol.rotation.z = -Math.PI / 2 + 0.6;
    dal.add(kol);
    fidan.add(dal);
    for (let k = 0; k < 3; k++) {
      const y = new THREE.Mesh(yaprakGeo, yaprakMat);
      y.position.set(boy * (0.55 + k * 0.22), boy * 0.5 + k * 0.006, (k - 1) * 0.012);
      y.rotation.set(-0.9 + k * 0.3, k * 0.8, -0.4);
      y.scale.setScalar(0.8 + k * 0.15);
      y.userData.faz = yapraklar.length * 1.7;
      y.userData.ilk = y.rotation.clone();
      dal.add(y);
      yapraklar.push(y);
    }
  }
  const tepe = new THREE.Mesh(yaprakGeo, yaprakMat);
  tepe.position.y = 0.3;
  tepe.rotation.set(-0.3, 0.4, 0);
  tepe.userData = { faz: 0.5, ilk: tepe.rotation.clone() };
  fidan.add(tepe);
  yapraklar.push(tepe);
  // Toprağa batırılmış küçük etiket
  const etiketDoku = tuvalDokusu(200, 90, (g, w, h) => {
    g.fillStyle = "#e9d8b4";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#3b2416";
    g.font = "700 40px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("Çınar", w / 2, 46);
    g.font = "500 22px system-ui, sans-serif";
    g.fillText("v1 · deneysel", w / 2, 76);
  });
  const kazik = mesh(new THREE.BoxGeometry(0.004, 0.09, 0.002), mat(0xc9a77a), 0.03, 0.12, 0.035);
  fidan.add(kazik);
  const levha = mesh(new THREE.PlaneGeometry(0.06, 0.027), mat(0xffffff, { map: etiketDoku, roughness: 0.9 }), 0.03, 0.17, 0.037);
  fidan.add(levha);
  fidan.position.set(0.78, MASA_Y, -0.25);
  fidan.rotation.y = -0.5;
  sahne.add(fidan);

  // ---- L masanın sol kanadı: laboratuvar köşesi (radar, telemetri kartı, ağ geçidi) ----
  // antistatik mat, dönüş kolunun ortasında
  const esdDoku = tuvalDokusu(256, 320, (g, w, h) => {
    g.fillStyle = "#4a6b84";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,.08)";
    g.lineWidth = 1;
    for (let x = 16; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 16; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = "rgba(255,255,255,.35)";
    g.font = "600 13px system-ui, sans-serif";
    g.fillText("ESD SAFE", 10, h - 10);
  });
  const esdMat = mesh(kutu(0.46, 0.004, 0.56, 0.004), mat(0xffffff, { map: esdDoku, roughness: 1 }), -1.45, MASA_Y + 0.002, 0.7);
  sahne.add(esdMat);

  // Radar konsolu (Radar Target Tracker): askeri tip kasa, dönen taramalı PPI ekranı
  const radar = new THREE.Group();
  const radarGovde = new THREE.Group();
  const konsolMat = mat(0x56654f, { roughness: 0.6, metalness: 0.25 });
  const koyuMat = mat(0x1b1f1c, { roughness: 0.45, metalness: 0.4 });
  radarGovde.add(mesh(kutu(0.34, 0.27, 0.25, 0.018), konsolMat, 0, 0.145, 0));
  radarGovde.add(mesh(kutu(0.315, 0.25, 0.01, 0.006), mat(0x3f4a3a, { roughness: 0.7 }), 0, 0.145, 0.126)); // ön panel
  const RADAR_R = 0.098;
  const radarTuval = document.createElement("canvas");
  radarTuval.width = radarTuval.height = 256;
  const rg = radarTuval.getContext("2d");
  rg.fillStyle = "#020a04";
  rg.fillRect(0, 0, 256, 256);
  // kerteriz skalası: her karede tekrar çizilmesin diye ayrı tuvalde
  const skala = document.createElement("canvas");
  skala.width = skala.height = 256;
  const sg = skala.getContext("2d");
  sg.strokeStyle = "rgba(90, 255, 140, .55)";
  sg.fillStyle = "rgba(120, 255, 160, .7)";
  sg.font = "600 11px monospace";
  sg.textAlign = "center";
  for (let d = 0; d < 360; d += 10) {
    const a = (d - 90) * Math.PI / 180, uzun = d % 30 === 0;
    sg.lineWidth = uzun ? 2 : 1;
    sg.beginPath();
    sg.moveTo(128 + Math.cos(a) * 125, 128 + Math.sin(a) * 125);
    sg.lineTo(128 + Math.cos(a) * (uzun ? 116 : 120), 128 + Math.sin(a) * (uzun ? 116 : 120));
    sg.stroke();
    if (d % 90 === 0) sg.fillText(String(d).padStart(3, "0"), 128 + Math.cos(a) * 104, 132 + Math.sin(a) * 104);
  }
  const radarDoku = new THREE.CanvasTexture(radarTuval);
  radarDoku.colorSpace = THREE.SRGBColorSpace;
  const radarEkran = new THREE.Mesh(new THREE.CircleGeometry(RADAR_R, 48), new THREE.MeshBasicMaterial({ map: radarDoku, toneMapped: false }));
  radarEkran.position.set(-0.03, 0.16, 0.132);
  radarGovde.add(radarEkran);
  // ekranın etrafında güneşlik (kısa açık silindir) ve çerçeve
  const gunesluk = mesh(new THREE.CylinderGeometry(RADAR_R + 0.012, RADAR_R + 0.012, 0.035, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x1b1f1c, roughness: 0.5, side: THREE.DoubleSide }), -0.03, 0.16, 0.148);
  gunesluk.rotation.x = Math.PI / 2;
  radarGovde.add(gunesluk);
  radarGovde.add(mesh(new THREE.TorusGeometry(RADAR_R + 0.012, 0.006, 10, 48), koyuMat, -0.03, 0.16, 0.166));
  // sağda düğme sütunu: iki ayar düğmesi, üç anahtar, etiket
  for (const y of [0.225, 0.165]) {
    const d = mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.016, 20), koyuMat, 0.115, y, 0.138);
    d.rotation.x = Math.PI / 2;
    radarGovde.add(d);
    radarGovde.add(mesh(new THREE.BoxGeometry(0.003, 0.011, 0.002), mat(0xe8e2d6), 0.115, y + 0.004, 0.147));
  }
  for (let i = 0; i < 3; i++) {
    const s = mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.016, 8), mat(0xc9ccd3, { metalness: 0.9, roughness: 0.3 }), 0.095 + i * 0.02, 0.105, 0.14);
    s.rotation.x = Math.PI / 2 - 0.5;
    radarGovde.add(s);
  }
  const etiketPlaka = tuvalDokusu(160, 64, (g, w, h) => {
    g.fillStyle = "#d9d3bf";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1b1f1c";
    g.font = "700 20px monospace";
    g.fillText("PPI-30", 10, 28);
    g.font = "500 13px monospace";
    g.fillText("30 RPM · 40 km", 10, 50);
  });
  radarGovde.add(mesh(new THREE.PlaneGeometry(0.06, 0.024), mat(0xffffff, { map: etiketPlaka, roughness: 0.8 }), 0.115, 0.06, 0.132));
  const radarLed = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb020, toneMapped: false }));
  radarLed.position.set(0.115, 0.258, 0.133);
  radarGovde.add(radarLed);
  // yan havalandırma yarıkları ve taşıma kolları
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) radarGovde.add(mesh(kutu(0.004, 0.006, 0.15, 0.002), koyuMat, sx * 0.171, 0.09 + i * 0.022, -0.01));
    const kol = mesh(new THREE.TorusGeometry(0.045, 0.006, 8, 20, Math.PI), koyuMat, sx * 0.178, 0.2, 0);
    kol.rotation.set(0, Math.PI / 2, -Math.PI / 2 * sx);
    radarGovde.add(kol);
  }
  for (const [x, z] of [[-0.14, -0.1], [0.14, -0.1], [-0.14, 0.1], [0.14, 0.1]]) radarGovde.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 12), mat(0x111111, { roughness: 1 }), x, 0.006, z));
  radarGovde.rotation.x = -0.1; // ekran hafif yukarı bakar
  radarGovde.position.z = 0.02;
  radar.add(radarGovde);
  // arkadan duvara giden kablo
  radar.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(0.09, 0.07, -0.105), v3(0.09, 0.03, -0.14), v3(0.07, 0.004, -0.18), v3(0.02, 0.004, -0.24)]), 20, 0.004, 6), koyuMat));
  // Hedefler: yavaşça ilerleyen birkaç iz (ekran yarıçapına göre)
  const hedefler = Array.from({ length: 7 }, (_, i) => ({
    x: Math.cos(i * 2.1) * (0.25 + (i % 3) * 0.22), y: Math.sin(i * 2.1) * (0.25 + (i % 3) * 0.22),
    vx: Math.cos(i * 1.3) * 0.012, vy: Math.sin(i * 1.3) * 0.012,
  }));
  let taramaAci = 0;
  function radarCiz(dt) {
    const w = 256, m = w / 2, r = m - 3;
    // fosfor: önceki kare yavaşça söner
    rg.fillStyle = "rgba(2, 10, 4, 0.06)";
    rg.fillRect(0, 0, w, w);
    rg.strokeStyle = "rgba(60, 255, 120, .22)";
    rg.lineWidth = 1;
    for (const k of [0.33, 0.66]) {
      rg.beginPath();
      rg.arc(m, m, r * k, 0, Math.PI * 2);
      rg.stroke();
    }
    rg.beginPath();
    rg.moveTo(m - r, m); rg.lineTo(m + r, m); rg.moveTo(m, m - r); rg.lineTo(m, m + r);
    rg.stroke();
    const onceki = taramaAci;
    taramaAci = (taramaAci + dt * Math.PI) % (Math.PI * 2); // 30 RPM
    // son kareden bu yana taranan dilim (kare hızı düşükse de boşluk kalmaz)
    rg.fillStyle = "rgba(90, 255, 140, .3)";
    rg.beginPath();
    rg.moveTo(m, m);
    rg.arc(m, m, r, onceki, onceki <= taramaAci ? taramaAci : taramaAci + Math.PI * 2);
    rg.closePath();
    rg.fill();
    rg.strokeStyle = "rgba(140, 255, 175, .95)";
    rg.lineWidth = 2;
    rg.beginPath();
    rg.moveTo(m, m);
    rg.lineTo(m + Math.cos(taramaAci) * r, m + Math.sin(taramaAci) * r);
    rg.stroke();
    for (const h of hedefler) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      if (Math.hypot(h.x, h.y) > 0.85) { h.vx = -h.vx; h.vy = -h.vy; }
      let a = Math.atan2(h.y, h.x);
      if (a < 0) a += Math.PI * 2;
      const gecti = onceki <= taramaAci ? a > onceki && a <= taramaAci : a > onceki || a <= taramaAci;
      if (gecti) {
        rg.fillStyle = "rgba(170, 255, 190, 1)";
        rg.beginPath();
        rg.arc(m + h.x * r, m + h.y * r, 4, 0, Math.PI * 2);
        rg.fill();
      }
    }
    rg.drawImage(skala, 0, 0);
    radarDoku.needsUpdate = true;
  }
  radar.position.set(-1.45, MASA_Y, -0.17);
  radar.rotation.y = 0.45;
  sahne.add(radar);

  // Telemetri kartı (embedded-telemetry): Nucleo-F446RE, breadboard üzerinde MPU6050 ve BMP280
  const telemetri = new THREE.Group();
  const siyah = mat(0x15161a, { roughness: 0.5 });
  const pinDoku = tuvalDokusu(32, 256, (g, w, h) => {
    g.fillStyle = "#15161a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#d4af37";
    for (let y = 8; y < h; y += 16) for (const x of [8, 24]) g.fillRect(x - 3, y - 3, 6, 6);
  });
  const pinMat = mat(0xffffff, { map: pinDoku, roughness: 0.4 });
  /** Üstünde altın pin uçları görünen siyah pin başlığı. */
  function baslik(w, d, x, y, z) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(w, 0.008, d), siyah, 0, 0.004, 0));
    const ust = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pinMat);
    ust.rotation.x = -Math.PI / 2;
    ust.position.y = 0.0082;
    g.add(ust);
    g.position.set(x, y, z);
    return g;
  }
  const nucleoDoku = tuvalDokusu(256, 300, (g, w, h) => {
    g.fillStyle = "#f6f6f3";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e6e6e1";
    g.fillRect(0, 0, w, 78); // ST-LINK bölümü
    g.strokeStyle = "#b9b9b3";
    g.lineWidth = 2;
    g.setLineDash([6, 5]);
    g.beginPath(); g.moveTo(0, 78); g.lineTo(w, 78); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = "#d7d7d1";
    for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(60 + i * 10, 110); g.lineTo(60 + i * 10, 150 + (i % 3) * 8); g.stroke(); }
    g.fillStyle = "#1f3b73";
    g.font = "800 21px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("NUCLEO-F446RE", w / 2, 278);
    g.font = "700 15px system-ui, sans-serif";
    g.fillText("STM32", w / 2, 256);
    g.font = "600 11px monospace";
    g.fillStyle = "#555";
    g.fillText("CN7", 22, 96);
    g.fillText("CN10", w - 24, 96);
    g.fillText("ST-LINK V2-1", w / 2, 30);
  });
  const nucleo = new THREE.Group();
  const NW = 0.105, ND = 0.123;
  nucleo.add(mesh(new THREE.BoxGeometry(NW, 0.0025, ND), mat(0xf4f4f2, { roughness: 0.6 }), 0, 0.006, 0));
  const nucleoUst = new THREE.Mesh(new THREE.PlaneGeometry(NW, ND), mat(0xffffff, { map: nucleoDoku, roughness: 0.6 }));
  nucleoUst.rotation.x = -Math.PI / 2;
  nucleoUst.position.y = 0.0073;
  nucleo.add(nucleoUst);
  for (const [x, z] of [[-0.047, -0.055], [0.047, -0.055], [-0.047, 0.055], [0.047, 0.055]]) nucleo.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.005, 8), mat(0xb8bcc4, { metalness: 0.8 }), x, 0.0025, z)); // ayaklar
  nucleo.add(mesh(kutu(0.022, 0.003, 0.022, 0.001), siyah, 0, 0.0088, 0.012)); // MCU
  nucleo.add(mesh(kutu(0.012, 0.0025, 0.012, 0.001), siyah, 0.022, 0.0085, -0.038)); // ST-LINK MCU
  for (const x of [-NW / 2 + 0.008, NW / 2 - 0.008]) nucleo.add(baslik(0.008, 0.08, x, 0.0073, 0.02)); // morpho
  for (const x of [-0.032, 0.032]) nucleo.add(baslik(0.006, 0.055, x, 0.0073, 0.025)); // arduino
  nucleo.add(mesh(kutu(0.014, 0.008, 0.012, 0.002), mat(0xb8bcc4, { metalness: 0.9, roughness: 0.3 }), -0.02, 0.011, -ND / 2 + 0.004)); // USB
  const dugmeMavi = mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 12), mat(0x2f6fe0), -0.012, 0.0095, 0.048);
  nucleo.add(dugmeMavi, mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.004, 12), siyah, 0.012, 0.0095, 0.048));
  const kartLedMat = new THREE.MeshBasicMaterial({ color: 0x2bff6a, toneMapped: false });
  const kartLed = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.002, 0.003), kartLedMat);
  kartLed.position.set(0.0, 0.0085, 0.04);
  nucleo.add(kartLed);
  const kartIsik = new THREE.PointLight(0x2bff6a, 0, 0.12, 2);
  kartIsik.position.set(0.0, 0.02, 0.04);
  nucleo.add(kartIsik);
  // USB kablosu: karttan matın arkasına, duvara
  nucleo.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(-0.02, 0.011, -0.066), v3(-0.02, 0.01, -0.1), v3(-0.05, 0.004, -0.16), v3(-0.12, 0.004, -0.24)]), 20, 0.0025, 6), mat(0x2b2b2e, { roughness: 0.6 })));
  nucleo.position.set(-0.06, 0, 0.0);
  nucleo.rotation.y = -0.15;
  telemetri.add(nucleo);
  // breadboard: delik ızgarası ve kırmızı/mavi raylar
  const bbDoku = tuvalDokusu(128, 300, (g, w, h) => {
    g.fillStyle = "#f3f2ec";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#d63031"; g.fillRect(6, 0, 2, h);
    g.fillStyle = "#2f6fe0"; g.fillRect(w - 8, 0, 2, h);
    g.fillStyle = "#c8c6bc"; g.fillRect(w / 2 - 3, 0, 6, h);
    g.fillStyle = "#3a3a3a";
    for (let y = 6; y < h; y += 9) {
      for (const x of [14, 22]) g.fillRect(x, y, 3, 3);
      for (let k = 0; k < 5; k++) { g.fillRect(34 + k * 9, y, 3, 3); g.fillRect(w / 2 + 8 + k * 9, y, 3, 3); }
      for (const x of [w - 26, w - 18]) g.fillRect(x, y, 3, 3);
    }
  });
  const bb = new THREE.Group();
  bb.add(mesh(kutu(0.055, 0.01, 0.13, 0.002), mat(0xefeee8, { roughness: 0.8 }), 0, 0.005, 0));
  const bbUst = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.13), mat(0xffffff, { map: bbDoku, roughness: 0.8 }));
  bbUst.rotation.x = -Math.PI / 2;
  bbUst.position.y = 0.0101;
  bb.add(bbUst);
  /** Mor sensör kartı: üstünde çip ve etiket, altında pin başlığı. */
  function sensor(ad, w, d, z) {
    const g = new THREE.Group();
    const doku = tuvalDokusu(128, 96, (c, cw, ch) => {
      c.fillStyle = "#5a2c8a";
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = "#f0e8ff";
      c.font = "700 18px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText(ad, cw / 2, ch - 12);
      c.fillStyle = "#d4af37";
      for (let i = 0; i < 6; i++) c.beginPath(), c.arc(14 + i * 20, 12, 5, 0, Math.PI * 2), c.fill();
    });
    g.add(mesh(new THREE.BoxGeometry(w, 0.0016, d), mat(0x5a2c8a), 0, 0.012, 0));
    const ust = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0xffffff, { map: doku, roughness: 0.5 }));
    ust.rotation.x = -Math.PI / 2;
    ust.position.y = 0.0129;
    g.add(ust);
    g.add(mesh(kutu(0.005, 0.0015, 0.005, 0.0005), siyah, 0, 0.0137, -0.001));
    g.add(mesh(new THREE.BoxGeometry(w * 0.8, 0.008, 0.003), siyah, 0, 0.007, -d / 2 + 0.002));
    g.rotation.y = Math.PI / 2;
    g.position.set(0, 0, z);
    return g;
  }
  bb.add(sensor("MPU6050", 0.021, 0.016, -0.03), sensor("BMP280", 0.015, 0.012, 0.03));
  bb.position.set(0.07, 0, 0.0);
  telemetri.add(bb);
  // jumper kablolar: Nucleo başlığından breadboard'a (VCC, GND, SCL, SDA)
  [[0xd63031, 0.0], [0x222222, 0.008], [0xf1c40f, 0.016], [0x27ae60, 0.024]].forEach(([renk, k]) => {
    const egri = new THREE.CatmullRomCurve3([
      v3(-0.012, 0.016, -0.005 + k), v3(0.015, 0.04, -0.012 + k), v3(0.045, 0.03, -0.022 + k), v3(0.06, 0.014, -0.028 + k * 1.6),
    ]);
    telemetri.add(mesh(new THREE.TubeGeometry(egri, 16, 0.0012, 6), mat(renk, { roughness: 0.5 })));
  });
  telemetri.position.set(-1.45, MASA_Y + 0.004, 0.64);
  telemetri.rotation.y = 0.75;
  telemetri.scale.setScalar(1.5);
  sahne.add(telemetri);

  // Ağ anahtarı (Taktik Mesaj Ağ Geçidi): önde port LED'leri, kablolar arkadan duvara gider
  const gecit = new THREE.Group();
  const kasaKoyu = mat(0x2b2f37, { roughness: 0.35, metalness: 0.55 });
  gecit.add(mesh(kutu(0.28, 0.044, 0.16, 0.006), kasaKoyu, 0, 0.026, 0));
  for (const [x, z] of [[-0.12, -0.06], [0.12, -0.06], [-0.12, 0.06], [0.12, 0.06]]) gecit.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 10), mat(0x111111, { roughness: 1 }), x, 0.002, z));
  const onPanelDoku = tuvalDokusu(512, 80, (g, w, h) => {
    g.fillStyle = "#14171c";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e6ebf3";
    g.font = "800 30px 'JetBrains Mono', monospace";
    g.fillText("TMG-8", 18, 50);
    g.font = "500 15px system-ui, sans-serif";
    g.fillStyle = "#8f9bb3";
    g.fillText("tactical gateway", 130, 34);
    g.fillText("TCP · CRC-16", 130, 56);
    g.font = "600 12px monospace";
    g.textAlign = "center";
    for (let i = 0; i < 8; i++) g.fillText(String(i + 1), 296 + i * 26, 70);
  });
  const onPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.036), mat(0xffffff, { map: onPanelDoku, roughness: 0.3 }));
  onPanel.position.set(0, 0.026, 0.0805);
  gecit.add(onPanel);
  const portLedler = [];
  for (let i = 0; i < 8; i++) {
    const x = 0.0217 + i * 0.0137;
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.002), new THREE.MeshBasicMaterial({ color: 0x0f3a18, toneMapped: false }));
    led.position.set(x, 0.031, 0.0815);
    gecit.add(led);
    portLedler.push({ led, bagli: i < 5, sonraki: Math.random(), kirmizi: 0 });
  }
  const gucLed = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.002), new THREE.MeshBasicMaterial({ color: 0x3aa0ff, toneMapped: false }));
  gucLed.position.set(-0.125, 0.036, 0.0815);
  gecit.add(gucLed);
  // arka portlar ve duvara giden kablo demeti
  const kablolar = [0xf39c12, 0x3498db, 0xecf0f1, 0x3498db, 0xf39c12];
  for (let i = 0; i < 8; i++) {
    const x = 0.105 - i * 0.03;
    gecit.add(mesh(kutu(0.02, 0.016, 0.004, 0.001), mat(0x0d0f12), x, 0.024, -0.081));
    if (i >= kablolar.length) continue;
    gecit.add(mesh(kutu(0.016, 0.012, 0.016, 0.002), mat(0xdfe6ee, { roughness: 0.3 }), x, 0.024, -0.09));
    const egri = new THREE.CatmullRomCurve3([v3(x, 0.024, -0.098), v3(x * 0.7, 0.012, -0.14), v3(0.02 + i * 0.006, 0.004, -0.19), v3(0.03 + i * 0.008, 0.004, -0.32)]);
    gecit.add(mesh(new THREE.TubeGeometry(egri, 20, 0.0028, 6), mat(kablolar[i], { roughness: 0.6 })));
  }
  gecit.position.set(-1.13, MASA_Y, 0.2);
  gecit.rotation.y = 0.45;
  sahne.add(gecit);

  // Telefon (standda, ekranında oyun seçme ekranı)
  const telefon = new THREE.Group();
  const TEL_W = 0.07, TEL_H = 0.145;
  telefon.add(mesh(kutu(TEL_W + 0.008, TEL_H + 0.008, 0.009, 0.01), mat(0x0d0f13, { roughness: 0.3, metalness: 0.4 })));
  const telEkranMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const telEkran = new THREE.Mesh(new THREE.PlaneGeometry(TEL_W, TEL_H), telEkranMat);
  telEkran.position.z = 0.0048;
  telefon.add(telEkran);
  const stand = new THREE.Group();
  stand.add(mesh(kutu(0.09, 0.008, 0.08, 0.003), mat(0xc9ccd3, { metalness: 0.8, roughness: 0.3 }), 0, 0.004, 0));
  const destek = mesh(kutu(0.07, 0.11, 0.006, 0.003), mat(0xc9ccd3, { metalness: 0.8, roughness: 0.3 }), 0, 0.05, -0.025);
  destek.rotation.x = -0.35;
  stand.add(destek);
  telefon.rotation.x = -0.3;
  telefon.position.set(0, 0.085, -0.005);
  stand.add(telefon);
  stand.position.set(0.5, MASA_Y, -0.08);
  stand.rotation.y = -0.35;
  sahne.add(stand);

  // Defter (CV)
  const defter = new THREE.Group();
  const kapakDoku = tuvalDokusu(256, 360, (g, w, h) => {
    g.fillStyle = "#c8743a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#a85d2b";
    g.fillRect(0, 0, 26, h);
    g.fillStyle = "#fff8ec";
    g.font = "800 84px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("CV", w / 2 + 12, h / 2 + 10);
    g.font = "600 22px system-ui, sans-serif";
    g.fillText("Mustafa Gültürk", w / 2 + 12, h / 2 + 52);
  });
  defter.add(mesh(kutu(0.2, 0.018, 0.27, 0.004), mat(0xf4efe4), 0, 0.009, 0));
  const kapak = mesh(new THREE.PlaneGeometry(0.2, 0.27), mat(0xffffff, { map: kapakDoku, roughness: 0.8 }), 0, 0.0185, 0);
  kapak.rotation.x = -Math.PI / 2;
  defter.add(kapak);
  const kalem = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.15, 8), mat(0x2a9d8f), 0.13, 0.006, 0.02);
  kalem.rotation.set(Math.PI / 2, 0, 0.3);
  defter.add(kalem);
  defter.position.set(0.32, MASA_Y, 0.32);
  defter.rotation.y = -0.25;
  sahne.add(defter);

  // Zarf (iletişim)
  const zarf = new THREE.Group();
  const zarfDoku = tuvalDokusu(320, 210, (g, w, h) => {
    g.fillStyle = "#efe2c8";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#d6c3a0";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w / 2, h * 0.55);
    g.lineTo(w, 0);
    g.stroke();
    g.fillStyle = "#c0392b";
    g.beginPath();
    g.arc(w / 2, h * 0.55, 18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#3b2416";
    g.font = "600 20px system-ui, sans-serif";
    g.fillText("@", w - 46, h - 22);
  });
  zarf.add(mesh(kutu(0.18, 0.006, 0.12, 0.002), mat(0xefe2c8), 0, 0.003, 0));
  const zarfUst = mesh(new THREE.PlaneGeometry(0.18, 0.12), mat(0xffffff, { map: zarfDoku }), 0, 0.0065, 0);
  zarfUst.rotation.x = -Math.PI / 2;
  zarf.add(zarfUst);
  zarf.position.set(-0.6, MASA_Y, 0.3);
  zarf.rotation.y = 0.3;
  sahne.add(zarf);

  // Pencere (gece Gaziantep kalesi, gündüz gökyüzü)
  const pencere = new THREE.Group();
  const cerceveMat = mat(0xe8e2d6, { roughness: 0.6 });
  const PW = 0.8, PH = 0.95;
  pencere.add(mesh(kutu(PW + 0.08, 0.05, 0.08, 0.01), cerceveMat, 0, -PH / 2 - 0.02, 0.02));
  for (const x of [-PW / 2, 0, PW / 2]) pencere.add(mesh(kutu(0.035, PH, 0.04, 0.006), cerceveMat, x, 0, 0));
  for (const y of [-PH / 2, 0.08, PH / 2]) pencere.add(mesh(kutu(PW, 0.035, 0.04, 0.006), cerceveMat, 0, y, 0));
  const manzaraMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const manzara = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), manzaraMat);
  manzara.position.z = -0.01;
  pencere.add(manzara);
  pencere.position.set(-1.05, 1.5, -0.585);
  sahne.add(pencere);

  // Kitaplık rafı
  const raf = new THREE.Group();
  raf.add(mesh(kutu(0.9, 0.03, 0.22, 0.006), ahsap, 0, 0, 0));
  raf.add(mesh(kutu(0.9, 0.03, 0.22, 0.006), ahsap, 0, 0.34, 0));
  for (const x of [-0.3, 0.3]) raf.add(mesh(kutu(0.03, 0.06, 0.12, 0.004), ayakMat, x, -0.04, -0.05));
  const KITAPLAR = [
    ["C#", "#6b2fa0"], ["React", "#1f7a8c"], ["TypeScript", "#2f5fb3"], ["PostgreSQL", "#33658a"], ["Node.js", "#3c873a"],
    ["Docker", "#1d63ed"], ["Next.js", "#222"], ["Three.js", "#444"], [".NET", "#512bd4"], ["Git", "#e44c30"],
  ];
  let kx = -0.4;
  KITAPLAR.forEach(([ad, renk], i) => {
    const kal = 0.035 + ((i * 7) % 3) * 0.008;
    const boy = 0.2 + ((i * 5) % 4) * 0.02;
    const sirt = tuvalDokusu(64, 320, (g, w, h) => {
      g.fillStyle = renk;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,.18)";
      g.fillRect(0, 18, w, 6);
      g.fillRect(0, h - 24, w, 6);
      g.save();
      g.translate(w / 2 + 9, h / 2);
      g.rotate(-Math.PI / 2);
      g.fillStyle = "#fff";
      g.font = `700 ${ad.length > 8 ? 24 : 30}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.fillText(ad, 0, 0);
      g.restore();
    });
    const malz = [mat(renk), mat(renk), mat(0xf3ead8), mat(0xf3ead8), mat(0xffffff, { map: sirt }), mat(renk)];
    const kitap = new THREE.Mesh(new THREE.BoxGeometry(kal, boy, 0.16), malz);
    kitap.castShadow = kitap.receiveShadow = true;
    kitap.position.set(kx + kal / 2, 0.015 + boy / 2, 0.02);
    if (i === 7) kitap.rotation.z = 0.18;
    raf.add(kitap);
    kx += kal + 0.004;
  });
  // üst rafta küçük süsler: kupa ödül, saksı
  raf.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.06, 16), lambaMat, 0.32, 0.375, 0));
  raf.add(mesh(new THREE.SphereGeometry(0.035, 16, 12), lambaMat, 0.32, 0.43, 0));
  raf.position.set(0.85, 1.4, -0.48);
  sahne.add(raf);

  // Diploma çerçevesi
  const diploma = new THREE.Group();
  const diplomaDoku = tuvalDokusu(420, 300, (g, w, h) => {
    g.fillStyle = "#fbf7ee";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#c9a227";
    g.lineWidth = 8;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = "#3b2416";
    g.textAlign = "center";
    g.font = "700 30px Georgia, serif";
    g.fillText("Mustafa Gültürk", w / 2, 110);
    g.font = "italic 20px Georgia, serif";
    g.fillText("Yazılım Geliştirici", w / 2, 150);
    g.font = "600 18px system-ui, sans-serif";
    g.fillText("Gaziantep · 2026", w / 2, 200);
    g.fillStyle = "#c0392b";
    g.beginPath();
    g.arc(w - 70, h - 66, 24, 0, Math.PI * 2);
    g.fill();
  });
  diploma.add(mesh(kutu(0.46, 0.34, 0.025, 0.006), mat(0x2b1d14, { roughness: 0.5 })));
  const dipYuz = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28), mat(0xffffff, { map: diplomaDoku, roughness: 0.9 }));
  dipYuz.position.z = 0.0135;
  diploma.add(dipYuz);
  diploma.position.set(-0.2, 1.62, -0.585);
  sahne.add(diploma);

  // Monitör kenarına yapışkan notlar
  const notlar = [["Kadro ✓", "#ffe066", -0.36, 0.17, 0.12], ["Ocakbaşı ✓", "#ffb3c1", 0.355, -0.14, -0.08]];
  for (const [yazi, renk, x, y, aci] of notlar) {
    const d = tuvalDokusu(128, 128, (g, w, h) => {
      g.fillStyle = renk;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#333";
      g.font = "600 20px 'Comic Sans MS', system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText(yazi, w / 2, h / 2 + 6);
    });
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), mat(0xffffff, { map: d, roughness: 1 }));
    n.position.set(x, y, 0.004);
    n.rotation.z = aci;
    monitor.add(n);
  }

  // ---- Dokular: monitör masaüstü, telefon, pencere ----
  const [kadroImg, depomImg, qrImg, ocakImg, okeyImg, ocakSimge, okeySimge] = await Promise.all(
    [...["kadro", "depom", "qr", "ocakbasi", "okey"].map((a) => `assets/${a}/poster.webp`), "assets/ocakbasi/simge.svg", "assets/okey/simge.svg"].map(resimYukle)
  );

  function masaustuDokusu(gece) {
    return tuvalDokusu(1280, 800, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, gece ? "#1b1f3a" : "#5b8def");
      gr.addColorStop(1, gece ? "#4a1d5e" : "#a77bf3");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(0,0,0,.35)";
      g.fillRect(0, 0, w, 40);
      g.fillStyle = "#fff";
      g.font = "600 20px system-ui, sans-serif";
      g.fillText("mustafa@portfolyo", 20, 27);
      g.textAlign = "right";
      g.fillText("Projeler  ·  Hakkımda  ·  İletişim", w - 20, 27);
      g.textAlign = "left";
      g.font = "800 92px system-ui, sans-serif";
      g.fillText("Mustafa Gültürk", 70, 200);
      g.font = "500 36px system-ui, sans-serif";
      g.fillStyle = "rgba(255,255,255,.85)";
      g.fillText("Yazılım Geliştirici · Gaziantep", 74, 256);
      const kartlar = [[kadroImg, "Kadro"], [depomImg, "Depom"], [qrImg, "QR Sipariş"], [ocakImg, "Ocakbaşı"]];
      kartlar.forEach(([img, ad], i) => {
        const x = 70 + i * 290, y = 360, kw = 260, kh = 162;
        g.fillStyle = "rgba(0,0,0,.35)";
        g.fillRect(x + 6, y + 8, kw, kh + 50);
        g.fillStyle = "#fff";
        g.fillRect(x, y, kw, kh + 50);
        if (img) g.drawImage(img, x, y, kw, kh);
        g.fillStyle = "#111";
        g.font = "700 24px system-ui, sans-serif";
        g.fillText(ad, x + 14, y + kh + 34);
      });
      g.fillStyle = "rgba(255,255,255,.9)";
      g.font = "600 26px system-ui, sans-serif";
      g.fillText("▶  Projeleri açmak için monitöre tıkla", 70, 680);
    });
  }

  // Telefonun ekranı: HTML'deki oyun seçme ekranının (#oda-telefon .ot-ana) küçük bir kopyası
  const telefonDokusu = tuvalDokusu(360, 740, (g, w, h) => {
    const arka = g.createLinearGradient(0, 0, 0, h);
    arka.addColorStop(0, "#2c1d4a");
    arka.addColorStop(0.45, "#1b1f3a");
    arka.addColorStop(1, "#120d1c");
    g.fillStyle = arka;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,.85)";
    g.font = "600 15px system-ui, sans-serif";
    g.fillText("09:41", 22, 30);
    g.fillStyle = "#38bdf8";
    g.font = "500 13px monospace";
    g.fillText("OYUNLAR", 22, 74);
    g.fillStyle = "#fff";
    g.font = "800 30px system-ui, sans-serif";
    g.fillText("Ne oynayalım?", 22, 110);
    const kart = (y, img, sx, sy, sw, sh, simge, ad) => {
      const x = 22, kw = w - 44, kh = 130;
      g.save();
      g.beginPath();
      g.roundRect(x, y, kw, kh + 74, 18);
      g.clip();
      g.fillStyle = "#0d0f13";
      g.fillRect(x, y, kw, kh + 74);
      if (img) g.drawImage(img, sx, sy, sw, sh, x, y, kw, kh);
      g.restore();
      if (simge) g.drawImage(simge, x + 14, y + kh + 14, 46, 46);
      g.fillStyle = "#fff";
      g.font = "700 20px system-ui, sans-serif";
      g.fillText(ad, x + 74, y + kh + 44);
    };
    // Kapaklar 316x130 oranında kırpılır
    kart(140, ocakImg, 0, 140, 1280, 526, ocakSimge, "Ocakbaşı");
    kart(370, okeyImg, 0, 33, 1280, 526, okeySimge, "Okey Salonu");
    g.fillStyle = "rgba(255,255,255,.55)";
    g.fillRect(w / 2 - 60, h - 18, 120, 5);
  });
  telEkranMat.map = telefonDokusu;

  function manzaraDokusu(gece) {
    return tuvalDokusu(512, 608, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      if (gece) {
        gr.addColorStop(0, "#0b1030");
        gr.addColorStop(0.7, "#2b2f6b");
        gr.addColorStop(1, "#6d4a7a");
      } else {
        gr.addColorStop(0, "#5fa8ff");
        gr.addColorStop(0.75, "#bfe0ff");
        gr.addColorStop(1, "#f6e7c8");
      }
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      if (gece) {
        for (let i = 0; i < 90; i++) {
          g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`;
          g.fillRect(Math.random() * w, Math.random() * h * 0.6, 2, 2);
        }
        g.fillStyle = "#fff6d6";
        g.beginPath();
        g.arc(390, 110, 34, 0, Math.PI * 2);
        g.fill();
      } else {
        g.fillStyle = "rgba(255,255,255,.85)";
        for (const [x, y, r] of [[120, 120, 30], [160, 110, 40], [200, 125, 28], [360, 200, 26], [395, 190, 34]]) {
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
        }
      }
      // Gaziantep Kalesi silüeti: tepe, surlar, burçlar
      g.fillStyle = gece ? "#141433" : "#8a6a4f";
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(0, h * 0.8);
      g.quadraticCurveTo(w * 0.3, h * 0.66, w * 0.5, h * 0.66);
      g.quadraticCurveTo(w * 0.75, h * 0.66, w, h * 0.82);
      g.lineTo(w, h);
      g.fill();
      const sur = (x, y, bw, bh) => {
        g.fillRect(x, y - bh, bw, bh);
        for (let i = 0; i < bw; i += 14) g.fillRect(x + i, y - bh - 9, 8, 9);
      };
      sur(w * 0.22, h * 0.7, w * 0.56, 50);
      sur(w * 0.18, h * 0.72, 40, 90);
      sur(w * 0.46, h * 0.68, 46, 110);
      sur(w * 0.74, h * 0.72, 40, 86);
      // şehir ışıkları
      if (gece) {
        for (let i = 0; i < 70; i++) {
          g.fillStyle = Math.random() > 0.5 ? "#ffd27a" : "#ffb35c";
          g.fillRect(Math.random() * w, h * 0.84 + Math.random() * h * 0.15, 3, 3);
        }
      }
    });
  }

  const doku = { gece: { masaustu: masaustuDokusu(true), manzara: manzaraDokusu(true) }, gunduz: { masaustu: masaustuDokusu(false), manzara: manzaraDokusu(false) } };

  function temaUygula() {
    const gece = kok.dataset.theme !== "light";
    const d = gece ? doku.gece : doku.gunduz;
    ekranMat.map = d.masaustu;
    manzaraMat.map = d.manzara;
    ekranMat.needsUpdate = manzaraMat.needsUpdate = true;
    sahne.background = new THREE.Color(gece ? 0x0e0f16 : 0xdfe6f2);
    duvarMat.color.set(gece ? 0x3b4152 : 0xd9d3c7);
    gokIsik.intensity = gece ? 0.35 : 1.0;
    pencereIsik.intensity = gece ? 0.6 : 2.2;
    pencereIsik.color.set(gece ? 0x9db4ff : 0xfff1d6);
    lambaIsik.intensity = gece ? 9 : 3;
    sahne.environmentIntensity = gece ? 0.35 : 0.8;
  }
  temaUygula();
  new MutationObserver(temaUygula).observe(kok, { attributes: true, attributeFilter: ["data-theme"] });

  // ---- Etkileşim tanımları ----
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  function ekranaBak(nesne, yuzey, w, h, dolgu) {
    // Yüzeyi kameranın tam karşısına alacak konumu hesaplar
    const merkez = new THREE.Vector3();
    yuzey.getWorldPosition(merkez);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(yuzey.getWorldQuaternion(new THREE.Quaternion()));
    const fov = THREE.MathUtils.degToRad(kamera.fov);
    const uzakDikey = (h / 2) / Math.tan(fov / 2);
    const uzakYatay = (w / 2) / (Math.tan(fov / 2) * kamera.aspect);
    const uzak = Math.max(uzakDikey, uzakYatay) * dolgu;
    return { kamera: merkez.clone().addScaledVector(normal, uzak), hedef: merkez };
  }

  /** Nesnenin ön yüzüne (yerel +z) bakan, hafif yukarıdan bir odak. */
  function onden(grup, uzak, yuk, egim) {
    const hedef = grup.localToWorld(v(0, yuk, 0));
    const ileri = new THREE.Vector3(Math.sin(grup.rotation.y), 0, Math.cos(grup.rotation.y));
    return { kamera: hedef.clone().addScaledVector(ileri, uzak).add(v(0, uzak * egim + 0.12, 0)), hedef };
  }

  etkilesimler.push(
    { ad: "monitor", grup: monitor, baslik: "Projeler", odak: () => ekranaBak(monitor, ekran, EKRAN_W, EKRAN_H, kamera.aspect < 1 ? 1.06 : 1.28), yuzey: ekran, w: EKRAN_W, h: EKRAN_H },
    { ad: "telefon", grup: stand, baslik: "Telefonda oyna", odak: () => ekranaBak(telefon, telEkran, TEL_W, TEL_H, kamera.aspect < 1 ? 1.45 : 1.25), yuzey: telEkran, w: TEL_W, h: TEL_H },
    { ad: "raf", grup: raf, baslik: "Yetenekler", odak: () => ({ kamera: v(0.55, 1.5, 0.55), hedef: v(0.85, 1.5, -0.45) }), panel: true },
    { ad: "diploma", grup: diploma, baslik: "Hakkımda", odak: () => ({ kamera: v(-0.05, 1.6, 0.35), hedef: v(-0.2, 1.6, -0.58) }), panel: true },
    { ad: "pencere", grup: pencere, baslik: "Gaziantep", odak: () => ({ kamera: v(-0.75, 1.5, 0.6), hedef: v(-1.05, 1.45, -0.6) }), panel: true },
    { ad: "zarf", grup: zarf, baslik: "İletişim", odak: () => ({ kamera: v(-0.5, 1.35, 0.95), hedef: v(-0.6, 0.76, 0.28) }), panel: true },
    { ad: "defter", grup: defter, baslik: "CV", odak: () => ({ kamera: v(0.3, 1.2, 0.72), hedef: v(0.32, 0.76, 0.3) }), panel: true },
    { ad: "radar", grup: radar, baslik: "Radar · hedef takibi", odak: () => onden(radar, 1.0, 0.15, 0.05), panel: true },
    { ad: "telemetri", grup: telemetri, baslik: "Gömülü telemetri kartı", odak: () => onden(telemetri, 0.62, 0.03, 0.45), panel: true },
    { ad: "gecit", grup: gecit, baslik: "Taktik mesaj ağ geçidi", odak: () => onden(gecit, 0.7, 0.03, 0.35), panel: true },
    { ad: "fidan", grup: fidan, baslik: "Çınar · dil modeli", odak: () => ({ kamera: v(0.62, 1.12, 0.3), hedef: v(0.78, 0.93, -0.25) }), panel: true },
  );
  for (const e of etkilesimler) e.grup.traverse((o) => (o.userData.etkilesim = e));

  // İpucu noktaları
  const noktaDoku = tuvalDokusu(64, 64, (g) => {
    g.fillStyle = "rgba(255,255,255,.95)";
    g.beginPath();
    g.arc(32, 32, 10, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,.6)";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(32, 32, 22, 0, Math.PI * 2);
    g.stroke();
  });
  const noktalar = etkilesimler.map((e) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noktaDoku, transparent: true, depthTest: false, opacity: 0.85 }));
    const kutuB = new THREE.Box3().setFromObject(e.grup);
    const c = kutuB.getCenter(new THREE.Vector3());
    s.position.set(c.x, kutuB.max.y + 0.05, c.z);
    s.scale.setScalar(0.045);
    s.renderOrder = 10;
    s.userData.etkilesim = e;
    sahne.add(s);
    return s;
  });

  // ---- Kamera ----
  const genel = { kamera: v(0, 1.42, 1.65), hedef: v(0, 1.08, -0.2) };
  const kameraDurum = { konum: genel.kamera.clone(), hedef: genel.hedef.clone() };
  let animasyon = null; // { bas, bit, t0, sure }
  let odaktaki = null;
  const fareKonum = new THREE.Vector2(0, 0);
  const fareYumusak = new THREE.Vector2(0, 0);

  function genelGorunus() {
    const dar = kamera.aspect < 1;
    kamera.fov = dar ? 58 : 40;
    kamera.updateProjectionMatrix();
    return dar ? { kamera: v(0.05, 1.55, 2.25), hedef: v(0.05, 1.08, -0.15) } : genel;
  }

  function git(hedefDurum, sure = 1.3) {
    animasyon = {
      bas: { konum: kameraDurum.konum.clone(), hedef: kameraDurum.hedef.clone() },
      bit: { konum: hedefDurum.kamera.clone(), hedef: hedefDurum.hedef.clone() },
      t0: performance.now(),
      sure: azHareket ? 0.01 : sure,
    };
  }

  /** Yan panel açılacaksa nesneyi panelin kapatmadığı tarafa kaydırır (genişte sola, dar ekranda yukarı). */
  function panelliOdak(e) {
    const o = e.odak();
    if (!e.panel) return o;
    const yon = o.hedef.clone().sub(o.kamera);
    const uzak = yon.length();
    yon.normalize();
    const sag = new THREE.Vector3().crossVectors(yon, new THREE.Vector3(0, 1, 0)).normalize();
    const ust = new THREE.Vector3().crossVectors(sag, yon).normalize();
    if (kamera.aspect >= 1) {
      const k = sag.multiplyScalar(uzak * 0.3);
      return { kamera: o.kamera.clone().add(k), hedef: o.hedef.clone().add(k) };
    }
    const geri = yon.clone().multiplyScalar(-uzak * 0.5);
    const asagi = ust.multiplyScalar(-uzak * 0.42);
    return { kamera: o.kamera.clone().add(geri).add(asagi), hedef: o.hedef.clone().add(asagi) };
  }

  function odaklan(e) {
    if (odaktaki === e) return;
    odaktaki = e;
    katmanlar.gizle();
    git(panelliOdak(e));
    geri.hidden = false;
    ipucu.hidden = true;
    etiket.hidden = true;
    kap.classList.add("odakta");
    animasyon.bitince = () => onOdak(e.ad, e.yuzey ? yuzeyDikdortgeni(e) : null);
  }

  function cik() {
    if (!odaktaki) return;
    odaktaki = null;
    katmanlar.gizle();
    git(genelGorunus(), 1.1);
    geri.hidden = true;
    ipucu.hidden = false;
    kap.classList.remove("odakta");
    onCikis();
  }
  geri.addEventListener("click", cik);
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.querySelector("dialog[open]")) cik();
  });

  /** Ekran yüzeyinin pencere üzerindeki dikdörtgeni (HTML katmanını üstüne oturtmak için). */
  function yuzeyDikdortgeni(e) {
    const r = renderer.domElement.getBoundingClientRect();
    const koseler = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const p = new THREE.Vector3((sx * e.w) / 2, (sy * e.h) / 2, 0);
      e.yuzey.localToWorld(p);
      p.project(kamera);
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
    });
    const xs = koseler.map((k) => k.x), ys = koseler.map((k) => k.y);
    return { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }

  // ---- Fare / dokunma ----
  const isin = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let uzerinde = null;

  function sec(x, y) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    isin.setFromCamera(ndc, kamera);
    const vurus = isin.intersectObjects([...etkilesimler.map((e) => e.grup), ...noktalar], true)[0];
    return vurus?.object.userData.etkilesim ?? null;
  }

  renderer.domElement.addEventListener("pointermove", (ev) => {
    fareKonum.set((ev.clientX / innerWidth) * 2 - 1, (ev.clientY / innerHeight) * 2 - 1);
    if (odaktaki || ev.pointerType === "touch") return;
    const e = sec(ev.clientX, ev.clientY);
    if (e !== uzerinde) {
      uzerinde = e;
      renderer.domElement.style.cursor = e ? "pointer" : "";
      etiket.hidden = !e;
      if (e) etiket.textContent = e.baslikCeviri?.() ?? e.baslik;
    }
    if (e) {
      etiket.style.left = ev.clientX + 16 + "px";
      etiket.style.top = ev.clientY + 12 + "px";
    }
  });
  renderer.domElement.addEventListener("click", (ev) => {
    const e = sec(ev.clientX, ev.clientY);
    if (e) odaklan(e);
    else if (odaktaki) cik();
  });

  // ---- Boyut ----
  function boyutla() {
    const w = kap.clientWidth, h = kap.clientHeight;
    renderer.setSize(w, h, false);
    kamera.aspect = w / h;
    const g = genelGorunus();
    if (!odaktaki && !animasyon) {
      kameraDurum.konum.copy(g.kamera);
      kameraDurum.hedef.copy(g.hedef);
    } else if (odaktaki) {
      const o = panelliOdak(odaktaki);
      kameraDurum.konum.copy(o.kamera);
      kameraDurum.hedef.copy(o.hedef);
      animasyon = null;
      onOdak(odaktaki.ad, odaktaki.yuzey ? yuzeyDikdortgeni(odaktaki) : null);
    }
    kamera.updateProjectionMatrix();
  }
  new ResizeObserver(boyutla).observe(kap);
  boyutla();

  // Açılış: uzaktan yaklaşma
  const ilk = genelGorunus();
  kameraDurum.konum.copy(ilk.kamera).add(v(0.6, 0.5, 1.4));
  git(ilk, 2.2);

  // ---- Döngü ----
  const saat = new THREE.Clock();
  const Y_EKSEN = new THREE.Vector3(0, 1, 0);
  const bakis = new THREE.Vector3(), bakisSag = new THREE.Vector3(), bakisHedef = new THREE.Vector3();
  let oncekiT = 0;
  let calisiyor = true;
  let bitecek = null;
  function kare() {
    if (!calisiyor) return;
    requestAnimationFrame(kare);
    const t = saat.getElapsedTime();
    const dt = Math.min(0.1, t - oncekiT);
    oncekiT = t;

    if (animasyon) {
      const k = Math.min(1, (performance.now() - animasyon.t0) / (animasyon.sure * 1000));
      const e = yumusak(k);
      kameraDurum.konum.lerpVectors(animasyon.bas.konum, animasyon.bit.konum, e);
      kameraDurum.hedef.lerpVectors(animasyon.bas.hedef, animasyon.bit.hedef, e);
      if (k >= 1) {
        bitecek = animasyon.bitince;
        animasyon = null;
      }
    }

    // genel görünüşte fareyle hafif bakınma
    fareYumusak.lerp(odaktaki || azHareket ? new THREE.Vector2() : fareKonum, 0.05);
    // genel görünüşte baş hareketi: kamera yerinde durur, bakış fareye döner (sola daha çok, L masanın kanadına)
    kamera.position.copy(kameraDurum.konum);
    bakis.subVectors(kameraDurum.hedef, kameraDurum.konum);
    bakis.applyAxisAngle(Y_EKSEN, -fareYumusak.x * (fareYumusak.x < 0 ? 0.7 : 0.22));
    bakisSag.set(-bakis.z, 0, bakis.x).normalize();
    bakis.applyAxisAngle(bakisSag, -fareYumusak.y * 0.1);
    kamera.lookAt(bakisHedef.addVectors(kamera.position, bakis));
    kamera.updateMatrixWorld();
    if (bitecek) {
      const f = bitecek;
      bitecek = null;
      f();
    }

    // buhar
    for (const s of buharlar) {
      const f = (t * 0.25 + s.userData.faz) % 1;
      s.position.set(-0.5 + Math.sin(f * 6 + s.userData.faz * 10) * 0.012, MASA_Y + 0.1 + f * 0.22, 0.12);
      s.scale.setScalar(0.03 + f * 0.06);
      s.material.opacity = Math.sin(f * Math.PI) * 0.35;
    }
    // ipucu noktaları nabız
    const nabiz = 0.04 + Math.sin(t * 3) * 0.006;
    for (const n of noktalar) {
      n.scale.setScalar(nabiz);
      n.visible = !odaktaki;
    }
    // fidanın yaprakları rüzgârda hafifçe sallanır; üzerine gelince daha çok
    const ruzgar = uzerinde?.ad === "fidan" || odaktaki?.ad === "fidan" ? 0.25 : 0.06;
    if (!azHareket) for (const y of yapraklar) {
      y.rotation.x = y.userData.ilk.x + Math.sin(t * 2.2 + y.userData.faz) * ruzgar;
      y.rotation.z = y.userData.ilk.z + Math.cos(t * 1.7 + y.userData.faz) * ruzgar * 0.6;
    }
    // laboratuvar köşesi: radar taraması, kartın 1 Hz LED'i, anahtarın port LED'leri
    radarCiz(azHareket ? 0 : dt);
    radarLed.visible = t % 1 < 0.85;
    const ledAcik = t % 1 < 0.5;
    kartLedMat.color.setHex(ledAcik ? 0x2bff6a : 0x0b2a14);
    kartIsik.intensity = ledAcik ? 0.04 : 0;
    for (const p of portLedler) {
      if (!p.bagli) continue;
      if (t > p.sonraki) {
        // arada bir bozuk paket: kırmızı yanar, akış yeniden senkronlanır
        p.kirmizi = Math.random() < 0.04 ? t + 0.25 : 0;
        p.sonraki = t + 0.04 + Math.random() * 0.35;
        p.led.material.color.setHex(p.kirmizi ? 0xff3b30 : Math.random() < 0.6 ? 0x39ff6a : 0x0f3a18);
      }
    }

    // lamba hafif titreşim
    lambaIsik.intensity += ((kok.dataset.theme !== "light" ? 9 : 3) + Math.sin(t * 13) * 0.05 - lambaIsik.intensity) * 0.1;

    renderer.render(sahne, kamera);
  }
  kare();

  // Sekme gizlenince durdur
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) calisiyor = false;
    else if (!calisiyor) {
      calisiyor = true;
      kare();
    }
  });

  return { cik, odaklan: (ad) => odaklan(etkilesimler.find((e) => e.ad === ad)), etkilesimler };
}
