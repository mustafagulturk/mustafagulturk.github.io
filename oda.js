/**
 * 3D çalışma odası. Site bu odayla açılır: masadaki nesnelere tıklanınca kamera o nesneye yaklaşır.
 *   Monitör   → projeler (ekranın içinde gerçek HTML arayüz)
 *   Telefon   → oyun seçme ekranı: Ocakbaşı ya da Okey Salonu telefonun ekranında oynanır
 *   Kitaplık  → yetenekler
 *   Diploma   → hakkımda
 *   Zarf      → iletişim
 *   Defter    → CV
 *   Fidan     → Çınar (sıfırdan eğitilmiş Türkçe dil modeli, deneysel proje)
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
  const solDuvar = mesh(new THREE.PlaneGeometry(6, 4), duvarMat, -1.9, 2, 2.4);
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
  sahne.add(mesh(kutu(1.8, 0.05, 0.85, 0.012), ahsap, 0, MASA_Y - 0.025, 0));
  const ayakMat = mat(0x1f2229, { metalness: 0.6, roughness: 0.4 });
  for (const [x, z] of [[-0.85, -0.37], [0.85, -0.37], [-0.85, 0.37], [0.85, 0.37]]) {
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

  etkilesimler.push(
    { ad: "monitor", grup: monitor, baslik: "Projeler", odak: () => ekranaBak(monitor, ekran, EKRAN_W, EKRAN_H, kamera.aspect < 1 ? 1.06 : 1.28), yuzey: ekran, w: EKRAN_W, h: EKRAN_H },
    { ad: "telefon", grup: stand, baslik: "Telefonda oyna", odak: () => ekranaBak(telefon, telEkran, TEL_W, TEL_H, kamera.aspect < 1 ? 1.45 : 1.25), yuzey: telEkran, w: TEL_W, h: TEL_H },
    { ad: "raf", grup: raf, baslik: "Yetenekler", odak: () => ({ kamera: v(0.55, 1.5, 0.55), hedef: v(0.85, 1.5, -0.45) }), panel: true },
    { ad: "diploma", grup: diploma, baslik: "Hakkımda", odak: () => ({ kamera: v(-0.05, 1.6, 0.35), hedef: v(-0.2, 1.6, -0.58) }), panel: true },
    { ad: "pencere", grup: pencere, baslik: "Gaziantep", odak: () => ({ kamera: v(-0.75, 1.5, 0.6), hedef: v(-1.05, 1.45, -0.6) }), panel: true },
    { ad: "zarf", grup: zarf, baslik: "İletişim", odak: () => ({ kamera: v(-0.5, 1.35, 0.95), hedef: v(-0.6, 0.76, 0.28) }), panel: true },
    { ad: "defter", grup: defter, baslik: "CV", odak: () => ({ kamera: v(0.3, 1.2, 0.72), hedef: v(0.32, 0.76, 0.3) }), panel: true },
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
  let calisiyor = true;
  let bitecek = null;
  function kare() {
    if (!calisiyor) return;
    requestAnimationFrame(kare);
    const t = saat.getElapsedTime();

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
    kamera.position.copy(kameraDurum.konum);
    kamera.position.x += fareYumusak.x * 0.12;
    kamera.position.y -= fareYumusak.y * 0.06;
    kamera.lookAt(kameraDurum.hedef);
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
