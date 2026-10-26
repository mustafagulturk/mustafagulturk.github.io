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
 *     Radar tableti → Radar Target Tracker
 *     Telemetri kutusu (Nucleo kartı + sensörler) → gömülü telemetri
 *     Ağ anahtarı   → Taktik Mesaj Ağ Geçidi
 * Pencerenin solunda, altın rozetlere asılı Türk bayrağı.
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
  // duvarlar ortam haritasından etkilenmez, hafif öz ışık alır: iki duvar aynı tonda görünür
  const duvarMat = mat(0x3b4152, { roughness: 0.95, envMapIntensity: 0 });
  const zemin = mesh(new THREE.PlaneGeometry(8, 8), mat(0x4a3426, { roughness: 0.85 }));
  zemin.rotation.x = -Math.PI / 2;
  sahne.add(zemin);
  const SOL_DUVAR_X = -3.55; // masanın sol ucundan iki masa eni uzakta
  const TAVAN_Y = 2.6; // görünen alanın bir tık üstünde
  const arkaDuvar = mesh(new THREE.PlaneGeometry(4 - SOL_DUVAR_X, TAVAN_Y), duvarMat, (4 + SOL_DUVAR_X) / 2, TAVAN_Y / 2, -0.6);
  sahne.add(arkaDuvar);
  const solDuvar = mesh(new THREE.PlaneGeometry(6, TAVAN_Y), duvarMat, SOL_DUVAR_X, TAVAN_Y / 2, 2.4);
  solDuvar.rotation.y = Math.PI / 2;
  sahne.add(solDuvar);
  // süpürgelik iki duvar boyunca, köşede birleşir; köşede ince bir pervaz
  const supurgelikMat = mat(0x2b2f3b);
  sahne.add(mesh(kutu(4 - SOL_DUVAR_X, 0.08, 0.02, 0.004), supurgelikMat, (4 + SOL_DUVAR_X) / 2, 0.04, -0.59));
  const solSupurgelik = mesh(kutu(6, 0.08, 0.02, 0.004), supurgelikMat, SOL_DUVAR_X + 0.01, 0.04, 2.4);
  solSupurgelik.rotation.y = Math.PI / 2;
  sahne.add(solSupurgelik);
  const kosePervaz = mesh(kutu(0.03, TAVAN_Y, 0.03, 0.01), duvarMat, SOL_DUVAR_X + 0.012, TAVAN_Y / 2, -0.588);
  sahne.add(kosePervaz);
  // tavan: duvarlardan bir ton açık; iki duvarın üstünde aynı profilde, köşede birleşen tavan pervazı
  const tavanMat = mat(0x454b5d, { roughness: 0.95, envMapIntensity: 0 });
  const tavan = mesh(new THREE.PlaneGeometry(4 - SOL_DUVAR_X, 6), tavanMat, (4 + SOL_DUVAR_X) / 2, TAVAN_Y, 2.4);
  tavan.rotation.x = Math.PI / 2;
  sahne.add(tavan);
  const pervazMat = mat(0xe8e3d8, { roughness: 0.6 });
  for (const [h, d, y] of [[0.05, 0.025, TAVAN_Y - 0.025], [0.02, 0.045, TAVAN_Y - 0.01]]) {
    sahne.add(mesh(kutu(4 - SOL_DUVAR_X, h, d, 0.006), pervazMat, (4 + SOL_DUVAR_X) / 2, y, -0.6 + d / 2));
    const sol = mesh(kutu(6, h, d, 0.006), pervazMat, SOL_DUVAR_X + d / 2, y, 2.4);
    sol.rotation.y = Math.PI / 2;
    sahne.add(sol);
  }

  // halı
  const hali = mesh(new THREE.CircleGeometry(1.1, 48), mat(0x8c2f39, { roughness: 1 }), 0.1, 0.003, 0.6);
  hali.rotation.x = -Math.PI / 2;
  sahne.add(hali);

  // ---- Masa ----
  const ahsap = mat(0x9a6a43, { roughness: 0.55 });
  const MASA_Y = 0.75;
  // Tek parça L masa: iki kolu da aynı derinlikte; sol kol öne döner (laboratuvar köşesi), duvarlara yapışmaz
  // köşeler yuvarlatılır; iki kolun birleştiği iç köşe geniş bir kavisle akar
  const masaKoseler = [[0.9, -0.425, 0.03], [0.9, 0.425, 0.06], [-1.0, 0.425, 0.38], [-1.0, 1.6, 0.06], [-1.85, 1.6, 0.06], [-1.85, -0.425, 0.03]];
  const masaSekli = new THREE.Shape();
  masaKoseler.forEach(([x, z, r], i) => {
    const [ox, oz] = masaKoseler[(i + masaKoseler.length - 1) % masaKoseler.length];
    const [sx, sz] = masaKoseler[(i + 1) % masaKoseler.length];
    const once = Math.hypot(ox - x, oz - z), sonra = Math.hypot(sx - x, sz - z);
    const ax = x + ((ox - x) / once) * r, az = z + ((oz - z) / once) * r;
    const bx = x + ((sx - x) / sonra) * r, bz = z + ((sz - z) / sonra) * r;
    if (i === 0) masaSekli.moveTo(ax, -az); else masaSekli.lineTo(ax, -az);
    masaSekli.quadraticCurveTo(x, -z, bx, -bz);
  });
  masaSekli.closePath();
  const masaGeo = new THREE.ExtrudeGeometry(masaSekli, { depth: 0.038, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 24 });
  masaGeo.rotateX(-Math.PI / 2);
  sahne.add(mesh(masaGeo, ahsap, 0, MASA_Y - 0.044, 0));
  const ayakMat = mat(0x1f2229, { metalness: 0.6, roughness: 0.4 });
  for (const [x, z] of [[0.85, -0.37], [0.85, 0.37], [-1.8, -0.37], [-1.8, 1.55], [-1.05, 1.55]]) {
    sahne.add(mesh(kutu(0.045, MASA_Y - 0.05, 0.045, 0.008), ayakMat, x, (MASA_Y - 0.05) / 2, z));
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
  // Radar tableti (Radar Target Tracker): ince, standa oturan tablet; ekranda canlı PPI ve iz tablosu
  const radar = new THREE.Group();
  const aluMat = mat(0xc9ccd3, { metalness: 0.85, roughness: 0.28 });
  const TAB_W = 0.34, TAB_H = 0.22;
  // stand: ince alüminyum taban ve geriye yatık destek
  radar.add(mesh(kutu(0.16, 0.008, 0.12, 0.004), aluMat, 0, 0.004, -0.02));
  const destekKol = mesh(kutu(0.05, 0.15, 0.008, 0.003), aluMat, 0, 0.075, -0.055);
  destekKol.rotation.x = -0.3;
  radar.add(destekKol);
  const tablet = new THREE.Group();
  tablet.add(mesh(kutu(TAB_W + 0.014, TAB_H + 0.014, 0.008, 0.008), mat(0x0c0d10, { roughness: 0.25, metalness: 0.4 })));
  const RW = 640, RH = 400;
  const radarTuval = document.createElement("canvas");
  radarTuval.width = RW;
  radarTuval.height = RH;
  const rg = radarTuval.getContext("2d");
  rg.fillStyle = "#03100a";
  rg.fillRect(0, 0, RW, RH);
  const radarDoku = new THREE.CanvasTexture(radarTuval);
  radarDoku.colorSpace = THREE.SRGBColorSpace;
  radarDoku.anisotropy = 4;
  const radarEkran = new THREE.Mesh(new THREE.PlaneGeometry(TAB_W, TAB_H), new THREE.MeshBasicMaterial({ map: radarDoku, toneMapped: false }));
  radarEkran.position.z = 0.0042;
  tablet.add(radarEkran);
  const radarLed = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 8, 6), new THREE.MeshBasicMaterial({ color: 0x3dff8a, toneMapped: false }));
  radarLed.position.set(0, TAB_H / 2 + 0.004, 0.0042);
  tablet.add(radarLed);
  tablet.rotation.x = -0.3; // ekran hafif yukarı bakar
  tablet.position.set(0, 0.125, -0.02);
  radar.add(tablet);
  // ekranın masaya düşen yeşil parıltısı
  const radarIsik = new THREE.PointLight(0x3dff8a, 0.06, 0.35, 2);
  radarIsik.position.set(0, 0.12, 0.12);
  radar.add(radarIsik);

  // PPI: sol tarafta daire, sağda iz tablosu, üstte durum çubuğu
  const PX = 205, PY = 214, PR = 170;
  const skala = document.createElement("canvas");
  skala.width = RW;
  skala.height = RH;
  const sg = skala.getContext("2d");
  sg.strokeStyle = "rgba(61, 255, 138, .5)";
  sg.fillStyle = "rgba(140, 255, 185, .75)";
  sg.font = "600 12px monospace";
  sg.textAlign = "center";
  for (let d = 0; d < 360; d += 5) {
    const a = (d - 90) * Math.PI / 180, uzun = d % 30 === 0;
    sg.lineWidth = uzun ? 1.6 : 0.8;
    sg.beginPath();
    sg.moveTo(PX + Math.cos(a) * PR, PY + Math.sin(a) * PR);
    sg.lineTo(PX + Math.cos(a) * (PR - (uzun ? 10 : 5)), PY + Math.sin(a) * (PR - (uzun ? 10 : 5)));
    sg.stroke();
    if (d % 90 === 0) sg.fillText(String(d).padStart(3, "0"), PX + Math.cos(a) * (PR - 22), PY + 4 + Math.sin(a) * (PR - 22));
  }
  const hedefler = Array.from({ length: 7 }, (_, i) => ({
    no: 101 + i * 7,
    x: Math.cos(i * 2.1) * (0.25 + (i % 3) * 0.22), y: Math.sin(i * 2.1) * (0.25 + (i % 3) * 0.22),
    vx: Math.cos(i * 1.3) * 0.012, vy: Math.sin(i * 1.3) * 0.012,
  }));
  let taramaAci = 0;
  let tabloZamani = 0;
  function radarCiz(dt) {
    // fosfor: yalnızca daire içi yavaşça söner
    rg.save();
    rg.beginPath();
    rg.arc(PX, PY, PR, 0, Math.PI * 2);
    rg.clip();
    rg.fillStyle = "rgba(3, 16, 10, 0.07)";
    rg.fillRect(PX - PR, PY - PR, PR * 2, PR * 2);
    rg.strokeStyle = "rgba(61, 255, 138, .16)";
    rg.lineWidth = 1;
    for (const k of [0.25, 0.5, 0.75]) {
      rg.beginPath();
      rg.arc(PX, PY, PR * k, 0, Math.PI * 2);
      rg.stroke();
    }
    rg.beginPath();
    rg.moveTo(PX - PR, PY); rg.lineTo(PX + PR, PY); rg.moveTo(PX, PY - PR); rg.lineTo(PX, PY + PR);
    rg.stroke();
    const onceki = taramaAci;
    taramaAci = (taramaAci + dt * Math.PI) % (Math.PI * 2); // 30 RPM
    // son kareden bu yana taranan dilim (kare hızı düşükse de boşluk kalmaz)
    rg.fillStyle = "rgba(61, 255, 138, .22)";
    rg.beginPath();
    rg.moveTo(PX, PY);
    rg.arc(PX, PY, PR, onceki, onceki <= taramaAci ? taramaAci : taramaAci + Math.PI * 2);
    rg.closePath();
    rg.fill();
    rg.strokeStyle = "rgba(170, 255, 205, .95)";
    rg.lineWidth = 2;
    rg.beginPath();
    rg.moveTo(PX, PY);
    rg.lineTo(PX + Math.cos(taramaAci) * PR, PY + Math.sin(taramaAci) * PR);
    rg.stroke();
    for (const h of hedefler) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      if (Math.hypot(h.x, h.y) > 0.85) { h.vx = -h.vx; h.vy = -h.vy; }
      let a = Math.atan2(h.y, h.x);
      if (a < 0) a += Math.PI * 2;
      const gecti = onceki <= taramaAci ? a > onceki && a <= taramaAci : a > onceki || a <= taramaAci;
      if (gecti) {
        const x = PX + h.x * PR, y = PY + h.y * PR;
        rg.strokeStyle = "rgba(190, 255, 215, 1)";
        rg.lineWidth = 1.5;
        rg.strokeRect(x - 5, y - 5, 10, 10);
        rg.beginPath();
        rg.moveTo(x, y);
        rg.lineTo(x + h.vx * 900, y + h.vy * 900); // hız vektörü
        rg.stroke();
        rg.fillStyle = "rgba(190, 255, 215, .9)";
        rg.font = "600 11px monospace";
        rg.textAlign = "left";
        rg.fillText("T" + h.no, x + 8, y - 6);
      }
    }
    rg.restore();
    rg.drawImage(skala, 0, 0);
    // durum çubuğu ve iz tablosu: saniyede birkaç kez tazelenir
    tabloZamani -= dt;
    if (tabloZamani <= 0) {
      tabloZamani = 0.25;
      rg.fillStyle = "#06150e";
      rg.fillRect(0, 0, RW, 26);
      rg.fillRect(400, 26, RW - 400, RH - 26);
      rg.fillStyle = "rgba(61, 255, 138, .9)";
      rg.font = "700 13px monospace";
      rg.textAlign = "left";
      rg.fillText("RADAR · PPI", 14, 18);
      rg.fillStyle = "rgba(140, 255, 185, .6)";
      rg.font = "500 12px monospace";
      rg.fillText("30 RPM   RNG 40 km   KALMAN", 130, 18);
      rg.textAlign = "right";
      rg.fillText("TRK " + hedefler.length + "/40", RW - 14, 18);
      rg.textAlign = "left";
      rg.fillStyle = "rgba(61, 255, 138, .85)";
      rg.font = "700 12px monospace";
      rg.fillText("İZ    MENZİL  KERTERİZ", 416, 54);
      rg.strokeStyle = "rgba(61, 255, 138, .25)";
      rg.beginPath(); rg.moveTo(416, 62); rg.lineTo(RW - 16, 62); rg.stroke();
      rg.font = "500 12px monospace";
      hedefler.forEach((h, i) => {
        const menzil = (Math.hypot(h.x, h.y) * 40).toFixed(1).padStart(4, " ");
        let ker = (Math.atan2(h.y, h.x) * 180 / Math.PI + 90 + 360) % 360;
        rg.fillStyle = i === 0 ? "rgba(190, 255, 215, 1)" : "rgba(140, 255, 185, .7)";
        rg.fillText(`T${h.no}  ${menzil}   ${String(Math.round(ker)).padStart(3, "0")}°`, 416, 84 + i * 22);
      });
      rg.fillStyle = "rgba(140, 255, 185, .45)";
      rg.fillText("GNN · M/N 3/5 · χ² 9.21", 416, RH - 20);
    }
    radarDoku.needsUpdate = true;
  }
  // masanın köşesine çapraz oturur, odaya bakar
  radar.position.set(-1.64, MASA_Y, -0.24);
  radar.rotation.y = Math.PI / 4;
  sahne.add(radar);

  // Telemetri ünitesi (embedded-telemetry): şeffaf kapaklı kutuda Nucleo-F446RE ve sensörler, önde canlı OLED
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
    g.fillStyle = "#1f3b73";
    g.font = "800 21px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("NUCLEO-F446RE", w / 2, 278);
    g.font = "700 15px system-ui, sans-serif";
    g.fillText("STM32", w / 2, 256);
  });
  const nucleo = new THREE.Group();
  const NW = 0.105, ND = 0.123;
  nucleo.add(mesh(new THREE.BoxGeometry(NW, 0.0025, ND), mat(0xf4f4f2, { roughness: 0.6 }), 0, 0.006, 0));
  const nucleoUst = new THREE.Mesh(new THREE.PlaneGeometry(NW, ND), mat(0xffffff, { map: nucleoDoku, roughness: 0.6 }));
  nucleoUst.rotation.x = -Math.PI / 2;
  nucleoUst.position.y = 0.0073;
  nucleo.add(nucleoUst);
  nucleo.add(mesh(kutu(0.022, 0.003, 0.022, 0.001), siyah, 0, 0.0088, 0.012)); // MCU
  nucleo.add(mesh(kutu(0.012, 0.0025, 0.012, 0.001), siyah, 0.022, 0.0085, -0.038)); // ST-LINK MCU
  for (const x of [-NW / 2 + 0.008, NW / 2 - 0.008]) nucleo.add(baslik(0.008, 0.08, x, 0.0073, 0.02)); // morpho
  nucleo.add(mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 12), mat(0x2f6fe0), -0.012, 0.0095, 0.048));
  const kartLedMat = new THREE.MeshBasicMaterial({ color: 0x2bff6a, toneMapped: false });
  const kartLed = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.002, 0.003), kartLedMat);
  kartLed.position.set(0.0, 0.0085, 0.04);
  nucleo.add(kartLed);
  const kartIsik = new THREE.PointLight(0x2bff6a, 0, 0.12, 2);
  kartIsik.position.set(0.0, 0.02, 0.04);
  nucleo.add(kartIsik);
  nucleo.rotation.y = Math.PI / 2; // kutunun uzun kenarı boyunca yatar
  nucleo.position.set(-0.03, 0.006, -0.004);
  telemetri.add(nucleo);
  /** Mor sensör kartı: üstünde çip ve etiket. */
  function sensor(ad, w, d) {
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
    g.add(mesh(new THREE.BoxGeometry(w, 0.0016, d), mat(0x5a2c8a), 0, 0.0, 0));
    const ust = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0xffffff, { map: doku, roughness: 0.5 }));
    ust.rotation.x = -Math.PI / 2;
    ust.position.y = 0.0009;
    g.add(ust);
    g.add(mesh(kutu(0.005, 0.0015, 0.005, 0.0005), siyah, 0, 0.0016, -0.001));
    return g;
  }
  const mpu = sensor("MPU6050", 0.021, 0.016);
  mpu.position.set(0.06, 0.016, -0.018);
  const bmp = sensor("BMP280", 0.016, 0.012);
  bmp.position.set(0.06, 0.016, 0.018);
  telemetri.add(mpu, bmp);
  // kutu: grafit alt gövde, şeffaf akrilik kapak, köşelerde vida başları
  const KW = 0.2, KD = 0.13, KH = 0.03;
  telemetri.add(mesh(kutu(KW, 0.012, KD, 0.006), mat(0x2a2d33, { roughness: 0.4, metalness: 0.3 }), 0, 0.006, 0));
  for (const [x, z, w, d] of [[0, KD / 2 - 0.003, KW, 0.006], [0, -KD / 2 + 0.003, KW, 0.006], [KW / 2 - 0.003, 0, 0.006, KD], [-KW / 2 + 0.003, 0, 0.006, KD]]) {
    telemetri.add(mesh(kutu(w, KH, d, 0.002), mat(0x2a2d33, { roughness: 0.4, metalness: 0.3 }), x, KH / 2, z));
  }
  const akrilik = new THREE.Mesh(kutu(KW, 0.004, KD, 0.003), new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, depthWrite: false }));
  akrilik.position.y = KH + 0.002;
  telemetri.add(akrilik);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    telemetri.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.002, 12), mat(0xb8bcc4, { metalness: 0.9, roughness: 0.3 }), x * (KW / 2 - 0.008), KH + 0.005, z * (KD / 2 - 0.008)));
  }
  // anten
  telemetri.add(mesh(new THREE.CylinderGeometry(0.0035, 0.004, 0.09, 10), siyah, KW / 2 - 0.012, KH + 0.045, -KD / 2 + 0.012));
  telemetri.add(mesh(new THREE.SphereGeometry(0.005, 10, 8), siyah, KW / 2 - 0.012, KH + 0.09, -KD / 2 + 0.012));
  // ön yüzde canlı OLED: irtifa, mod, paket sayacı, irtifa grafiği
  const oledTuval = document.createElement("canvas");
  oledTuval.width = 256;
  oledTuval.height = 64;
  const og = oledTuval.getContext("2d");
  const oledDoku = new THREE.CanvasTexture(oledTuval);
  oledDoku.colorSpace = THREE.SRGBColorSpace;
  const oled = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.025), new THREE.MeshBasicMaterial({ map: oledDoku, toneMapped: false }));
  oled.position.set(-0.03, 0.018, KD / 2 + 0.0005);
  telemetri.add(oled);
  const irtifaGecmis = [];
  let oledZamani = 0, paket = 0;
  function oledCiz(t, dt) {
    oledZamani -= dt;
    paket += Math.round(dt * 100);
    if (oledZamani > 0) return;
    oledZamani = 0.2;
    const irtifa = 60 + Math.sin(t * 0.3) * 55 + Math.sin(t * 1.7) * 0.6;
    irtifaGecmis.push(irtifa);
    if (irtifaGecmis.length > 40) irtifaGecmis.shift();
    og.fillStyle = "#020608";
    og.fillRect(0, 0, 256, 64);
    og.fillStyle = "#7fe3ff";
    og.font = "700 20px monospace";
    og.fillText(`ALT ${irtifa.toFixed(1).padStart(5, " ")} m`, 8, 26);
    og.font = "600 13px monospace";
    og.fillStyle = "#2bff6a";
    og.fillText("NORMAL", 8, 50);
    og.fillStyle = "#7fe3ff";
    og.fillText(`#${String(paket % 65536).padStart(5, "0")} CRC OK`, 70, 50);
    og.strokeStyle = "#7fe3ff";
    og.lineWidth = 1.5;
    og.beginPath();
    irtifaGecmis.forEach((a, i) => {
      const x = 186 + i * 1.7, y = 56 - (a / 120) * 46;
      if (i === 0) og.moveTo(x, y); else og.lineTo(x, y);
    });
    og.stroke();
    oledDoku.needsUpdate = true;
  }
  // USB kablosu: yan taraftan çıkar, masa üstünde yatarak kenara gider
  telemetri.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(-KW / 2 - 0.006, 0.014, -0.02), v3(-KW / 2 - 0.03, 0.006, -0.025), v3(-KW / 2 - 0.08, 0.003, -0.01), v3(-KW / 2 - 0.16, 0.003, 0.02)]), 20, 0.0025, 6), mat(0x2b2b2e, { roughness: 0.6 })));
  telemetri.add(mesh(kutu(0.01, 0.007, 0.012, 0.002), mat(0x2b2b2e), -KW / 2 - 0.004, 0.014, -0.02));
  telemetri.position.set(-1.5, MASA_Y, 0.55);
  telemetri.rotation.y = 0.75;
  telemetri.scale.setScalar(1.25);
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
    const egri = new THREE.CatmullRomCurve3([v3(x, 0.024, -0.098), v3(x * 0.85, 0.016, -0.125), v3(x * 0.5 + 0.01, 0.006, -0.145), v3(x * 0.3 + 0.01, -0.06, -0.165)]);
    gecit.add(mesh(new THREE.TubeGeometry(egri, 20, 0.0028, 6), mat(kablolar[i], { roughness: 0.6 })));
  }
  // arka duvar kenarında, tablet ile lamba arasında; kablolar doğrudan duvara iner
  gecit.position.set(-1.16, MASA_Y, -0.3);
  gecit.rotation.y = 0.12;
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

  // Türk bayrağı: pencerenin solunda, üst kenarı camla hizalı; duvarla bayrak ve bayrakla pencere arası eşit.
  // Çubuk yok: iki üst köşeden işlemeli altın rozetlere asılı, ortası hafifçe sarkan saten kumaş.
  const BAYRAK_BOSLUK = 0.2;
  const PENCERE_SOL = -1.05 - PW / 2 - 0.0175; // pencere kasasının sol kenarı
  const BH = PH, BW = PENCERE_SOL - SOL_DUVAR_X - 2 * BAYRAK_BOSLUK;
  const TW = Math.round((800 * BW) / BH);
  const bayrakDoku = tuvalDokusu(TW, 800, (g) => {
    // ay-yıldız resmî ölçülerde (Türk Bayrağı Kanunu, 800 px yükseklik), iki rozetin tam ortasında
    g.fillStyle = "#b0000f"; // kan kırmızısı
    g.fillRect(0, 0, TW, 800);
    g.save();
    g.translate(TW / 2 - (225 + 764.235) / 2, 0); // hilalin sol ucu ile yıldızın sağ ucu arası ortalanır
    g.fillStyle = "#fff";
    g.beginPath(); g.arc(425, 400, 200, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#b0000f";
    g.beginPath(); g.arc(475, 400, 160, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#fff";
    g.beginPath();
    [[583.334, 400], [764.235, 458.779], [652.431, 304.894], [652.431, 495.106], [764.235, 341.221]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
    g.restore();
    // dokuma: ince atkı/çözgü çizgileri, ışığı kumaş gibi kırar
    g.globalAlpha = 0.07;
    g.fillStyle = "#000";
    for (let y = 0; y < 800; y += 3) g.fillRect(0, y, TW, 1);
    g.fillStyle = "#fff";
    for (let x = 0; x < TW; x += 3) g.fillRect(x, 0, 1, 800);
    g.globalAlpha = 1;
  });
  bayrakDoku.anisotropy = 8;
  const dokumaDoku = tuvalDokusu(256, 256, (g, w, h) => {
    g.fillStyle = "#808080";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      g.fillStyle = (x + y) % 4 === 0 ? "#9a9a9a" : "#666";
      g.fillRect(x, y, 2, 2);
    }
  });
  dokumaDoku.colorSpace = THREE.NoColorSpace;
  dokumaDoku.wrapS = dokumaDoku.wrapT = THREE.RepeatWrapping;
  dokumaDoku.repeat.set(Math.round(12 * BW / (BH * 1.5)), 8);
  const bayrakGeo = new THREE.PlaneGeometry(BW, BH, 120, 64);
  const bayrakIlk = bayrakGeo.attributes.position.array.slice();
  const bayrakMat = new THREE.MeshPhysicalMaterial({
    // kadife: mat yüzey, parlaklık yalnızca ışığa göre değişen yumuşak tüy ışıltısı (sheen) ile gelir
    map: bayrakDoku, bumpMap: dokumaDoku, bumpScale: 0.25, roughness: 0.95, envMapIntensity: 0.25,
    sheen: 0.6, sheenRoughness: 0.85, sheenColor: new THREE.Color(0x7a0a12), side: THREE.DoubleSide,
  });
  const bayrak = new THREE.Mesh(bayrakGeo, bayrakMat);
  bayrak.castShadow = bayrak.receiveShadow = true;
  const bayrakGrup = new THREE.Group();
  bayrak.position.set(0, -BH / 2, 0.012);
  bayrakGrup.add(bayrak);
  // işlemeli askılar: duvara vidalı altın rozet (taç yapraklı), ortasında kabartma topuz, altında püskül
  const altin = mat(0xc9a227, { metalness: 0.9, roughness: 0.28 });
  const altinKoyu = mat(0x8a6a12, { metalness: 0.8, roughness: 0.4 });
  const rozetYaprakGeo = new THREE.SphereGeometry(0.011, 12, 8);
  for (const sx of [-1, 1]) {
    const rozet = new THREE.Group();
    const taban = mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.008, 28), altinKoyu, 0, 0, 0.004);
    taban.rotation.x = Math.PI / 2;
    rozet.add(taban);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const yaprak = mesh(rozetYaprakGeo, altin, Math.cos(a) * 0.021, Math.sin(a) * 0.021, 0.011);
      yaprak.scale.set(1, 0.55, 0.45);
      yaprak.rotation.z = a;
      rozet.add(yaprak);
    }
    const halka = mesh(new THREE.TorusGeometry(0.013, 0.0025, 8, 24), altin, 0, 0, 0.014);
    rozet.add(halka, mesh(new THREE.SphereGeometry(0.009, 16, 12), altin, 0, 0, 0.017));
    rozet.position.set(sx * (BW / 2 - 0.014), -0.012, 0.014);
    rozet.scale.setScalar(1.3);
    bayrakGrup.add(rozet);
    // püskül: rozetten sarkan ip, başlık ve saçaklar
    const ip = mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.07, 6), altin, sx * (BW / 2 - 0.014), -0.06, 0.04);
    const baslik = mesh(new THREE.SphereGeometry(0.008, 12, 10), altin, sx * (BW / 2 - 0.014), -0.097, 0.04);
    const sacak = mesh(new THREE.CylinderGeometry(0.004, 0.011, 0.045, 14, 1, true), altinKoyu, sx * (BW / 2 - 0.014), -0.125, 0.04);
    bayrakGrup.add(ip, baslik, sacak);
  }
  bayrakGrup.position.set(SOL_DUVAR_X + BAYRAK_BOSLUK + BW / 2, 1.5 + BH / 2, -0.6); // üst kenarı camın üst kenarıyla hizalı
  sahne.add(bayrakGrup);
  // Kumaş yalnızca iki üst köşeden tutulur: üst kenar zincir eğrisi gibi sarkar, altında U biçimli
  // sarkma kıvrımları oluşur, köşelerde rozete doğru büzülen ışınsal gerilim kıvrımları, alt yarıda dikey dökümler.
  function bayrakDalga(t) {
    const p = bayrakGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x0 = bayrakIlk[i * 3], y0 = bayrakIlk[i * 3 + 1];
      const u = (x0 + BW / 2) / BW, d = (BH / 2 - y0) / BH; // u: soldan sağa, d: yukarıdan aşağı (0..1)
      const yan = 4 * u * (1 - u); // köşelerde 0, ortada 1
      let x = x0, y = y0 - 0.075 * yan * (1 - 0.6 * d), z = 0;
      // üst kenarın altında U biçimli sarkma kıvrımları (zincir eğrisini izler)
      const s = d - 0.09 * yan;
      z += yan * Math.pow(1 - d, 1.3) * 0.022 * (0.5 - 0.5 * Math.cos(Math.PI * 2 * s * 3.2));
      // köşeler: rozete büzülen kumaş ve ondan yayılan ışınsal gerilim kıvrımları
      for (const sx of [-1, 1]) {
        const dx = (sx * BW / 2 - x0) * sx, dy = BH / 2 - y0; // köşeden içeri / aşağı uzaklık
        const r = Math.hypot(dx, dy), aci = Math.atan2(dy, dx);
        const yakin = Math.exp(-r / 0.22);
        z += yakin * (1 - Math.exp(-r / 0.025)) * 0.016 * Math.sin(aci * 7);
        const buz = Math.exp(-r / 0.07);
        x -= sx * dx * buz * 0.45; // köşe kumaşı rozete toplanır
        y += dy * buz * 0.45;
      }
      // alt yarıda yerçekimiyle dökülen dikey kıvrımlar, yanlar içe çekilir, alt köşeler hafifçe kıvrılır
      const alt = Math.max(0, d - 0.25) / 0.75;
      z += alt * 0.016 * (0.6 * Math.cos(u * Math.PI * 7 + 0.4) + 0.4 * Math.cos(u * Math.PI * 13 - 0.8));
      x += (0.5 - u) * 2 * alt * alt * 0.03 * (1 - yan);
      z += Math.pow(alt, 3) * (1 - yan) * 0.03;
      // kumaş duvardan hafifçe kabarır; köşelerde rozetin altında duvara yakın
      z += 0.018 * yan + 0.012 * d;
      // yavaş hava akımı
      z += (Math.sin(x0 * 6 + t * 1.1) * 0.6 + Math.sin(x0 * 3 - y0 * 4 + t * 0.7) * 0.4) * 0.005 * Math.min(1, yan + d);
      p.array[i * 3] = x;
      p.array[i * 3 + 1] = y - d * d * 0.004;
      p.array[i * 3 + 2] = Math.max(-0.008, z);
    }
    p.needsUpdate = true;
    bayrakGeo.computeVertexNormals();
  }
  bayrakDalga(0);

  // Sarkıt spot: duvarın dibinde, bayrağın tam ortası hizasında tavandan kabloyla sarkar;
  // başı bayrağa dönük, gece hafif sarı yanar, gündüz söner.
  const spotHedef = new THREE.Object3D();
  spotHedef.position.set(bayrakGrup.position.x, 1.3, -0.6);
  sahne.add(spotHedef);
  const SARKMA = 0.42;
  const spotKonum = v3(bayrakGrup.position.x, TAVAN_Y, -0.3);
  const spot = new THREE.Group();
  spot.position.copy(spotKonum);
  const spotGovdeMat = mat(0x1d1f26, { metalness: 0.55, roughness: 0.35 });
  const spotPirinc = mat(0xc9a227, { metalness: 0.9, roughness: 0.3 });
  // tavan göbeği, kablo, kablo ucunda pirinç bilezik ve mafsal
  spot.add(mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.022, 32), spotGovdeMat, 0, -0.011, 0));
  spot.add(mesh(new THREE.CylinderGeometry(0.0025, 0.0025, SARKMA - 0.03, 8), mat(0x111216, { roughness: 0.6 }), 0, -0.022 - (SARKMA - 0.03) / 2, 0));
  spot.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 16), spotPirinc, 0, -SARKMA + 0.01, 0));
  spot.add(mesh(new THREE.SphereGeometry(0.012, 16, 12), spotGovdeMat, 0, -SARKMA - 0.006, 0));
  // kafa: konik gövde, kafanın -Y ekseni hedefe döner; ucunda ışık veren mercek ve ince pirinç halka
  const spotKafa = new THREE.Group();
  spotKafa.position.set(0, -SARKMA - 0.006, 0);
  const kafaGovde = mesh(new THREE.CylinderGeometry(0.026, 0.04, 0.11, 32, 1, true), spotGovdeMat.clone(), 0, -0.065, 0);
  kafaGovde.material.side = THREE.DoubleSide;
  const kafaArka = mesh(new THREE.SphereGeometry(0.026, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), spotGovdeMat, 0, -0.01, 0);
  const spotMercekMat = new THREE.MeshStandardMaterial({ color: 0xffeab0, emissive: 0xffc04a, emissiveIntensity: 0 });
  const spotMercek = mesh(new THREE.CircleGeometry(0.036, 32), spotMercekMat, 0, -0.112, 0);
  spotMercek.rotation.x = Math.PI / 2;
  const spotHalka = mesh(new THREE.TorusGeometry(0.04, 0.0035, 8, 32), spotPirinc, 0, -0.12, 0);
  spotHalka.rotation.x = Math.PI / 2;
  spotKafa.add(kafaGovde, kafaArka, spotMercek, spotHalka);
  const kafaDunya = v3(spotKonum.x, spotKonum.y - SARKMA - 0.006, spotKonum.z);
  const spotYon = spotHedef.position.clone().sub(kafaDunya).normalize();
  spotKafa.quaternion.setFromUnitVectors(v3(0, -1, 0), spotYon);
  spot.add(spotKafa);
  sahne.add(spot);
  const bayrakSpot = new THREE.SpotLight(0xffc455, 0, 4, 0.85, 0.75, 1.6);
  bayrakSpot.position.copy(kafaDunya).addScaledVector(spotYon, 0.12);
  bayrakSpot.target = spotHedef;
  bayrakSpot.castShadow = true;
  bayrakSpot.shadow.mapSize.set(1024, 1024);
  bayrakSpot.shadow.bias = -0.0004;
  bayrakSpot.shadow.normalBias = 0.02; // kıvrımlı kumaşta gölge dalgalanmasını önler
  bayrakSpot.shadow.radius = 4;
  sahne.add(bayrakSpot);

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
    duvarMat.emissive.copy(duvarMat.color).multiplyScalar(gece ? 0.2 : 0.38);
    gokIsik.intensity = gece ? 0.35 : 1.0;
    pencereIsik.intensity = gece ? 0.6 : 2.2;
    pencereIsik.color.set(gece ? 0x9db4ff : 0xfff1d6);
    lambaIsik.intensity = gece ? 9 : 3;
    sahne.environmentIntensity = gece ? 0.35 : 0.8;
    // tavan rengi duvarla aynı aileden, bir ton açık; bayrak spotu yalnızca gece yanar
    tavanMat.color.set(gece ? 0x454b5d : 0xe6e1d7);
    tavanMat.emissive.copy(tavanMat.color).multiplyScalar(gece ? 0.2 : 0.38);
    bayrakSpot.intensity = gece ? 7 : 0;
    spotMercekMat.emissiveIntensity = gece ? 3 : 0;
    // kadife ışıltısı gündüz pencereden gelen ılık ışıkla canlanır, gece söner
    bayrakMat.sheen = gece ? 0.2 : 0.45;
    bayrakMat.sheenColor.set(gece ? 0x4a0610 : 0xa0202a);
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
    { ad: "radar", grup: radar, baslik: "Radar · hedef takibi", odak: () => onden(radar, 0.7, 0.13, 0.12), panel: true },
    { ad: "telemetri", grup: telemetri, baslik: "Gömülü telemetri kartı", odak: () => onden(telemetri, 0.5, 0.03, 0.55), panel: true },
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
    // genel görünüşte baş hareketi, insan başı gibi: ortada sakin, kenara gittikçe açılan dönüş.
    // Sola ~63° (yan duvar ve bayrak görünür), sağa ~23°. Gözler boyun ekseninin önünde olduğundan
    // dönerken bakış noktası boyun etrafında hafifçe yay çizer; baş dönüş yönüne biraz da yatar.
    const fx = fareYumusak.x, fy = fareYumusak.y;
    const k = Math.min(1, Math.abs(fx) / 0.8), kd = k * k * (3 - 2 * k); // ekranın %10'u kenarda tam dönüş
    const yaw = -Math.sign(fx) * kd * (fx < 0 ? 1.1 : 0.4);
    const pitch = -fy * (fy < 0 ? 0.22 : 0.14); // yukarı (tavana) biraz daha fazla
    bakis.subVectors(kameraDurum.hedef, kameraDurum.konum);
    bakisSag.set(-bakis.z, 0, bakis.x).normalize();
    // boyun ekseni gözlerin 9 cm arkasında; göz noktası bu eksen etrafında döner
    bakisHedef.copy(bakis).setY(0).normalize().multiplyScalar(0.09);
    kamera.position.copy(kameraDurum.konum).sub(bakisHedef).add(bakisHedef.applyAxisAngle(Y_EKSEN, yaw));
    bakis.applyAxisAngle(Y_EKSEN, yaw);
    bakisSag.applyAxisAngle(Y_EKSEN, yaw);
    bakis.applyAxisAngle(bakisSag, pitch);
    kamera.up.set(0, 1, 0).applyAxisAngle(bakis.clone().normalize(), yaw * 0.035);
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
    oledCiz(t, dt);
    if (!azHareket) bayrakDalga(t);
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
