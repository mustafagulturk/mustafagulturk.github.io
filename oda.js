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
 * Arka duvarda, diplomanın sağında C2 operasyon ekranı → C2 Map Display; onun sağında altı çerçeveli Ronaldo poster duvarı.
 * 28-30 Ekim'de (ya da ?bayram=1 ile): flama dizisi, sol duvarda 29 Ekim afişi, masa bayrağı, pencerede havai fişek.
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

// ---------- 29 Ekim süsleri ----------
// index.html'deki küçük betik 28-30 Ekim'de <html>'e "bayram" sınıfını ekler; süsler yalnızca o zaman kurulur.

const bayram = kok.classList.contains("bayram");
const cumhuriyetYili = Number(kok.dataset.cumhuriyetYili) || new Date().getFullYear() - 1923;

/** Ay-yıldızı resmî oranlarla çizer: (x, y) bayrağın sol üst köşesi, h bayrak yüksekliği. */
function ayYildizCiz(g, x, y, h, renk = "#fff") {
  const s = h / 800;
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = renk;
  // hilal: dış dairenin içinde kalıp iç dairenin dışında kalan bölge (zemin rengi gerekmez)
  g.save();
  g.beginPath(); g.arc(425, 400, 200, 0, Math.PI * 2); g.clip();
  g.beginPath(); g.rect(0, 0, 800, 800); g.arc(475, 400, 160, 0, Math.PI * 2); g.fill("evenodd");
  g.restore();
  g.beginPath();
  [[583.334, 400], [764.235, 458.779], [652.431, 304.894], [652.431, 495.106], [764.235, 341.221]].forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
  g.closePath();
  g.fill();
  g.restore();
}

/**
 * Odaya bayram süslerini ekler: iki duvar boyunca ay-yıldızlı flama dizisi, sol duvarda 29 Ekim afişi,
 * masada masa bayrağı ve pencerede gece havai fişek. Döngüden ve tema değişiminden çağrılacak işlevleri döndürür.
 */
function bayramSusleri(sahne, { SOL_DUVAR_X, TAVAN_Y, MASA_Y, pencere, PW, PH }) {
  // Flama dizisi: köşeden geçen tek ip, çivilerin arasında zincir eğrisi gibi sarkar
  const flamaDoku = tuvalDokusu(128, 160, (g, w, h) => {
    g.fillStyle = "#d70a18";
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w / 2, h); g.closePath(); g.fill();
    g.fillStyle = "rgba(0,0,0,.18)";
    g.fillRect(0, 0, w, 10); // ipe katlanan kenar
    ayYildizCiz(g, 8, 18, 72);
  });
  const flamaMat = new THREE.MeshStandardMaterial({ map: flamaDoku, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
  const flamaGeo = new THREE.PlaneGeometry(0.12, 0.15);
  flamaGeo.translate(0, -0.075, 0);
  const ipMat = mat(0xf2ede2, { roughness: 0.9 });
  const civiMat = mat(0xc9a227, { metalness: 0.9, roughness: 0.3 });
  const IP_Y = TAVAN_Y - 0.26, SARKMA = 0.14, DUVAR = 0.035;
  const kose = v3(SOL_DUVAR_X + DUVAR, IP_Y, -0.6 + DUVAR);
  const civiler = [v3(SOL_DUVAR_X + DUVAR, IP_Y, 2.6), v3(SOL_DUVAR_X + DUVAR, IP_Y, 1.0), kose];
  for (const x of [-1.95, -0.35, 1.25, 2.85]) civiler.push(v3(x, IP_Y, -0.6 + DUVAR));
  const flamalar = [];
  for (let i = 0; i < civiler.length - 1; i++) {
    const a = civiler[i], b = civiler[i + 1];
    const nokta = (u) => a.clone().lerp(b, u).setY(IP_Y - SARKMA * 4 * u * (1 - u));
    sahne.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 17 }, (_, k) => nokta(k / 16))), 32, 0.003, 6), ipMat));
    const yon = Math.atan2(-(b.z - a.z), b.x - a.x);
    const adet = Math.max(1, Math.round(a.distanceTo(b) / 0.17));
    for (let k = 0; k < adet; k++) {
      const u = (k + 0.5) / adet;
      const f = mesh(flamaGeo, flamaMat);
      f.position.copy(nokta(u));
      f.rotation.y = yon;
      f.userData = { faz: Math.random() * 6.28, yon };
      flamalar.push(f);
      sahne.add(f);
    }
    sahne.add(mesh(new THREE.SphereGeometry(0.008, 10, 8), civiMat, a.x, a.y, a.z));
  }
  const son = civiler[civiler.length - 1];
  sahne.add(mesh(new THREE.SphereGeometry(0.008, 10, 8), civiMat, son.x, son.y, son.z));

  // Sol duvar: 29 Ekim afişi. Altın çubuğa asılı kumaş, iki ucunda püskül.
  const AW = 1.5, AH = 0.95;
  const afisDoku = tuvalDokusu(1500, 950, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#c0081a");
    gr.addColorStop(1, "#8e0412");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#d9b44a";
    g.lineWidth = 6;
    g.strokeRect(34, 34, w - 68, h - 68);
    g.lineWidth = 2;
    g.strokeRect(48, 48, w - 96, h - 96);
    // solda büyük ay-yıldız, sağda yazılar
    ayYildizCiz(g, -40, 215, 520);
    g.textAlign = "center";
    const ox = 930;
    g.fillStyle = "#f3d27a";
    g.font = "600 46px Georgia, 'Times New Roman', serif";
    g.fillText("29 EKİM 1923", ox, 175);
    g.fillStyle = "#fff";
    g.font = "800 120px system-ui, sans-serif";
    g.fillText("CUMHURİYET", ox, 330);
    g.font = "800 84px system-ui, sans-serif";
    g.fillText(`${cumhuriyetYili} YAŞINDA`, ox, 440);
    g.fillStyle = "#d9b44a";
    g.fillRect(ox - 170, 492, 340, 4);
    g.fillStyle = "rgba(255,255,255,.95)";
    g.font = "italic 400 44px Georgia, 'Times New Roman', serif";
    g.fillText("“Cumhuriyet, fikri hür, vicdanı hür,", ox, 600);
    g.fillText("irfanı hür nesiller ister.”", ox, 662);
    g.fillStyle = "#f3d27a";
    g.font = "600 34px Georgia, 'Times New Roman', serif";
    g.fillText("Mustafa Kemal Atatürk", ox, 760);
    // dokuma
    g.globalAlpha = 0.06;
    g.fillStyle = "#000";
    for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
    g.globalAlpha = 1;
  });
  afisDoku.anisotropy = 8;
  const afisGeo = new THREE.PlaneGeometry(AW, AH, 60, 30);
  // kumaş: altın çubuktan düz iner, enine yumuşak dalgalar, alt kenar hafifçe öne kıvrılır
  const ap = afisGeo.attributes.position;
  for (let i = 0; i < ap.count; i++) {
    const x = ap.getX(i), d = (AH / 2 - ap.getY(i)) / AH;
    ap.setZ(i, 0.01 + d * (0.008 * Math.cos((x / AW) * Math.PI * 9) + 0.004 * Math.sin((x / AW) * Math.PI * 4)) + d ** 4 * 0.015);
  }
  afisGeo.computeVertexNormals();
  const afisMat = new THREE.MeshStandardMaterial({ map: afisDoku, emissiveMap: afisDoku, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.9 });
  const afis = new THREE.Group();
  const kumas = mesh(afisGeo, afisMat);
  kumas.castShadow = false;
  afis.add(kumas);
  const altin = mat(0xc9a227, { metalness: 0.9, roughness: 0.28 });
  const cubuk = mesh(new THREE.CylinderGeometry(0.011, 0.011, AW + 0.12, 16), altin, 0, AH / 2 + 0.005, 0.03);
  cubuk.rotation.z = Math.PI / 2;
  afis.add(cubuk);
  for (const sx of [-1, 1]) {
    afis.add(mesh(new THREE.SphereGeometry(0.02, 16, 12), altin, sx * (AW / 2 + 0.07), AH / 2 + 0.005, 0.03));
    afis.add(mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.12, 6), altin, sx * (AW / 2 + 0.03), AH / 2 - 0.06, 0.035));
    afis.add(mesh(new THREE.CylinderGeometry(0.005, 0.014, 0.07, 14, 1, true), mat(0x8a6a12, { metalness: 0.8, roughness: 0.4 }), sx * (AW / 2 + 0.03), AH / 2 - 0.15, 0.035));
  }
  // iki kordon çubuğu duvardaki çiviye bağlar
  const kordonGeo = new THREE.CylinderGeometry(0.0018, 0.0018, 0.2, 6);
  for (const sx of [-1, 1]) {
    const k = mesh(kordonGeo, altin, sx * AW * 0.18, AH / 2 + 0.085, 0.02);
    k.rotation.z = sx * 0.95;
    afis.add(k);
  }
  afis.add(mesh(new THREE.SphereGeometry(0.009, 10, 8), altin, 0, AH / 2 + 0.145, 0.01));
  afis.position.set(SOL_DUVAR_X, 1.42, 0.4);
  afis.rotation.y = Math.PI / 2;
  sahne.add(afis);
  // gece afişi aydınlatan, tavana gömülü sıcak spot
  const afisSpot = new THREE.SpotLight(0xffd59a, 0, 4, 0.75, 0.7, 1.4);
  afisSpot.position.set(SOL_DUVAR_X + 1.3, TAVAN_Y - 0.02, 0.4);
  afisSpot.target.position.set(SOL_DUVAR_X, 1.4, 0.4);
  sahne.add(afisSpot, afisSpot.target);

  // Masa bayrağı: krom direk, yuvarlak ahşap taban, uçta altın topuz; kumaş hafifçe dalgalanır
  const masaBayrak = new THREE.Group();
  masaBayrak.add(mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.022, 32), mat(0x3a2418, { roughness: 0.5 }), 0, 0.011, 0));
  masaBayrak.add(mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.34, 10), mat(0xd8dde4, { metalness: 0.95, roughness: 0.2 }), 0, 0.19, 0));
  masaBayrak.add(mesh(new THREE.SphereGeometry(0.008, 14, 10), altin, 0, 0.365, 0));
  const MBW = 0.18, MBH = 0.12;
  const masaBayrakDoku = tuvalDokusu(540, 360, (g, w, h) => {
    g.fillStyle = "#e30a17";
    g.fillRect(0, 0, w, h);
    ayYildizCiz(g, 0, 0, h);
  });
  const mbGeo = new THREE.PlaneGeometry(MBW, MBH, 24, 8);
  mbGeo.translate(MBW / 2 + 0.003, 0, 0);
  const mbIlk = mbGeo.attributes.position.array.slice();
  const mb = mesh(mbGeo, new THREE.MeshStandardMaterial({ map: masaBayrakDoku, side: THREE.DoubleSide, roughness: 0.8 }), 0, 0.345 - MBH / 2, 0);
  masaBayrak.add(mb);
  masaBayrak.position.set(-0.9, MASA_Y, -0.2);
  masaBayrak.rotation.y = -0.55;
  sahne.add(masaBayrak);

  // Pencerede havai fişek: camın önünde, ışığı toplanarak eklenen ince bir katman (yalnızca gece)
  const fc = document.createElement("canvas");
  fc.width = 256;
  fc.height = 304;
  const fg = fc.getContext("2d");
  const fisekDoku = new THREE.CanvasTexture(fc);
  fisekDoku.colorSpace = THREE.SRGBColorSpace;
  const fisekMat = new THREE.MeshBasicMaterial({ map: fisekDoku, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const fisek = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), fisekMat);
  fisek.position.z = -0.005;
  pencere.add(fisek);
  // hilal biçimli patlama için noktalar
  const hilal = [];
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    const x = Math.cos(a), y = Math.sin(a);
    if (Math.hypot(x - 0.25, y) > 0.8) hilal.push([x, y]);
  }
  const roketler = [], kivilcimlar = [];
  let sonraki = 0.4, fisekZaman = 0, cizimBirikim = 0;
  function patlat(r) {
    const renk = Math.random() < 0.6 ? [255, 60, 60] : [255, 245, 235];
    const hilalMi = Math.random() < 0.3;
    const nokta = hilalMi ? hilal : Array.from({ length: 42 }, (_, i) => [Math.cos((i / 42) * 6.283), Math.sin((i / 42) * 6.283)]);
    const hiz = 34 + Math.random() * 18;
    for (const [x, y] of nokta) {
      const k = hilalMi ? 1 : 0.75 + Math.random() * 0.5;
      kivilcimlar.push({ x: r.x, y: r.y, vx: x * hiz * k, vy: y * hiz * k, omur: 1.3 + Math.random() * 0.5, yas: 0, renk });
    }
  }
  function fisekCiz(dt) {
    fisekZaman += dt;
    if (fisekZaman > sonraki) {
      roketler.push({ x: 50 + Math.random() * 156, y: 304, vy: -(150 + Math.random() * 40), hedef: 60 + Math.random() * 90 });
      sonraki = fisekZaman + 0.7 + Math.random() * 1.3;
    }
    for (const r of roketler) r.y += r.vy * dt;
    for (let i = roketler.length - 1; i >= 0; i--) if (roketler[i].y < roketler[i].hedef) patlat(roketler.splice(i, 1)[0]);
    for (const k of kivilcimlar) {
      k.yas += dt;
      k.vy += 22 * dt;
      k.vx *= 1 - 1.2 * dt;
      k.vy *= 1 - 1.2 * dt;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
    }
    for (let i = kivilcimlar.length - 1; i >= 0; i--) if (kivilcimlar[i].yas > kivilcimlar[i].omur) kivilcimlar.splice(i, 1);
    // tuval ~30 fps yenilenir
    cizimBirikim += dt;
    if (cizimBirikim < 1 / 30) return;
    cizimBirikim = 0;
    fg.globalCompositeOperation = "source-over";
    fg.fillStyle = "rgba(0,0,0,.28)"; // iz bırakarak söner
    fg.fillRect(0, 0, fc.width, fc.height);
    fg.globalCompositeOperation = "lighter";
    fg.fillStyle = "rgba(255,210,150,.9)";
    for (const r of roketler) fg.fillRect(r.x - 1, r.y, 2, 5);
    for (const k of kivilcimlar) {
      const s = 1 - k.yas / k.omur;
      fg.fillStyle = `rgba(${k.renk[0]},${k.renk[1]},${k.renk[2]},${s})`;
      fg.fillRect(k.x - 1.2, k.y - 1.2, 2.4, 2.4);
    }
    fisekDoku.needsUpdate = true;
  }

  return {
    kare(t, dt, azHareket) {
      if (fisek.visible && !azHareket) fisekCiz(dt);
      if (azHareket) return;
      for (const f of flamalar) f.rotation.x = Math.sin(t * 1.3 + f.userData.faz) * 0.12;
      const p = mbGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = mbIlk[i * 3], u = x / MBW;
        p.array[i * 3 + 2] = Math.sin(x * 38 - t * 3.2) * 0.008 * u;
      }
      p.needsUpdate = true;
      mbGeo.computeVertexNormals();
    },
    tema(gece) {
      fisek.visible = gece;
      afisSpot.intensity = gece ? 6 : 0;
      afisMat.emissiveIntensity = gece ? 0.06 : 0;
    },
  };
}

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
  // kavisli ekran: düz geometriyi önünde duran dikey bir eksen etrafında büker, kenarlar izleyene doğru gelir
  const KAVIS_R = 1.5;
  function buk(geo) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = p.getX(i) / KAVIS_R, r = KAVIS_R - p.getZ(i);
      p.setXYZ(i, r * Math.sin(a), p.getY(i), KAVIS_R - r * Math.cos(a));
    }
    geo.computeVertexNormals();
    return geo;
  }
  const EKRAN_SEHIM = KAVIS_R * (1 - Math.cos(EKRAN_W / 2 / KAVIS_R));
  // premium görünüm: ince parlak cam çerçeve, uzay grisi alüminyum arka kabuk ve ayak
  const camCerceve = mat(0x07080a, { roughness: 0.12, metalness: 0.2 });
  const alu = mat(0x5b616b, { metalness: 0.85, roughness: 0.28 });
  monitor.add(mesh(buk(new THREE.BoxGeometry(EKRAN_W + 0.014, EKRAN_H + 0.014, 0.006, 48, 1, 1).translate(0, 0, -0.002)), camCerceve));
  monitor.add(mesh(buk(new THREE.BoxGeometry(EKRAN_W + 0.01, EKRAN_H + 0.01, 0.016, 48, 1, 1).translate(0, 0, -0.013)), alu));
  monitor.add(mesh(kutu(0.28, 0.18, 0.03, 0.014), alu, 0, -0.01, -0.034));
  const boyun = mesh(kutu(0.07, 0.33, 0.012, 0.005), alu, 0, -0.215, -0.07);
  boyun.rotation.x = -0.14;
  monitor.add(boyun);
  const taban = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.007, 48), alu, 0, -0.3765, -0.05);
  taban.scale.z = 0.6;
  monitor.add(taban);
  // alt çenede küçük beyaz güç ışığı
  monitor.add(mesh(new THREE.BoxGeometry(0.012, 0.0015, 0.002), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, -EKRAN_H / 2 - 0.0045, 0.002));
  const ekranMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const ekran = new THREE.Mesh(buk(new THREE.PlaneGeometry(EKRAN_W, EKRAN_H, 48, 1)), ekranMat);
  ekran.position.z = 0.0015;
  monitor.add(ekran);
  monitor.position.set(0, MASA_Y + 0.38, -0.2);
  sahne.add(monitor);

  // İkinci monitör: sağda dikey duran kod ekranı; Kalman izleyicisi satır satır yazılıyor
  const kodMonitor = new THREE.Group();
  const KOD_W = 0.3, KOD_H = 0.5;
  kodMonitor.add(mesh(kutu(KOD_W + 0.012, KOD_H + 0.012, 0.006, 0.004), camCerceve, 0, 0, -0.002));
  kodMonitor.add(mesh(kutu(KOD_W + 0.018, KOD_H + 0.018, 0.016, 0.007), alu, 0, 0, -0.012));
  kodMonitor.add(mesh(new THREE.BoxGeometry(0.01, 0.0015, 0.002), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, -KOD_H / 2 - 0.0042, 0.002));
  // arkada pivot göbeği, alüminyum boyun ve oval taban
  kodMonitor.add(mesh(kutu(0.09, 0.09, 0.024, 0.01), alu, 0, 0, -0.032));
  const kodAyak = new THREE.Group();
  kodAyak.add(mesh(kutu(0.045, 0.3, 0.01, 0.004), alu, 0, 0.15, 0));
  const kodTaban = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.006, 40), alu, 0, 0.003, 0.02);
  kodTaban.scale.z = 0.65;
  kodAyak.add(kodTaban);
  kodAyak.position.set(0, -0.33, -0.046);
  kodMonitor.add(kodAyak);
  const KT_W = 640, KT_H = Math.round((640 * KOD_H) / KOD_W);
  const kodTuval = document.createElement("canvas");
  kodTuval.width = KT_W;
  kodTuval.height = KT_H;
  const kg = kodTuval.getContext("2d");
  const kodDoku = new THREE.CanvasTexture(kodTuval);
  kodDoku.colorSpace = THREE.SRGBColorSpace;
  kodDoku.anisotropy = 8;
  const kodEkran = new THREE.Mesh(new THREE.PlaneGeometry(KOD_W, KOD_H), new THREE.MeshBasicMaterial({ map: kodDoku, toneMapped: false }));
  kodEkran.position.z = 0.0015;
  kodMonitor.add(kodEkran);
  kodMonitor.position.set(0.56, MASA_Y + 0.33, -0.24);
  kodMonitor.rotation.y = -0.38;
  sahne.add(kodMonitor);
  // monitörlerin arkasından duvara vuran yumuşak ortam ışığı; gece belirgin, gündüz neredeyse yok
  const arkaIsikDoku = tuvalDokusu(512, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(140, 110, 255, 0.9)");
    gr.addColorStop(0.45, "rgba(90, 120, 255, 0.35)");
    gr.addColorStop(1, "rgba(60, 90, 255, 0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const arkaIsikMat = new THREE.MeshBasicMaterial({ map: arkaIsikDoku, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 });
  const arkaIsik = mesh(new THREE.PlaneGeometry(1.5, 0.6), arkaIsikMat, 0.22, MASA_Y + 0.4, -0.596);
  sahne.add(arkaIsik);

  // basit sözdizimi renkleri: anahtar kelime, tür, sayı, yorum, metin
  const KOD = [
    "package iz",
    "",
    "// Kalman: sabit hızlı model, 2B konum + hız",
    "type Kalman struct {",
    "\tx  mat.VecDense // [px py vx vy]",
    "\tP  mat.Dense",
    "\tQ  float64",
    "\tR  float64",
    "}",
    "",
    "// Tahmin: durumu dt kadar ileri taşı",
    "func (k *Kalman) Tahmin(dt float64) {",
    "\tF := sabitHiz(dt)",
    "\tk.x.MulVec(F, &k.x)",
    "\tk.P.Mul(F, &k.P)",
    "\tk.P.Mul(&k.P, F.T())",
    "\tk.P.Add(&k.P, surec(dt, k.Q))",
    "}",
    "",
    "// Guncelle: radar ölçümüyle düzelt",
    "func (k *Kalman) Guncelle(z Olcum) {",
    "\ty := yenilik(z, &k.x)",
    "\tS := artikKov(&k.P, k.R)",
    "\tK := kazanc(&k.P, S)",
    "\tk.x.AddVec(&k.x, carp(K, y))",
    "\tk.P = joseph(&k.P, K, k.R)",
    "}",
    "",
    "func (k *Kalman) Esle(o Olcum) bool {",
    "\treturn mahalanobis(o, k) < 9.21",
    "}",
  ];
  const ANAHTAR = /\b(package|type|struct|func|return|if|for|range|var|const)\b/g;
  const TUR = /\b(float64|bool|int|mat\.VecDense|mat\.Dense|Kalman|Olcum)\b/g;
  function kodSatir(s, x, y) {
    if (s.trimStart().startsWith("//")) { kg.fillStyle = "#6a9955"; kg.fillText(s, x, y); return; }
    const renkler = new Array(s.length).fill("#d4d4d4");
    const boya = (re, r) => { for (const m of s.matchAll(re)) for (let i = 0; i < m[0].length; i++) renkler[m.index + i] = r; };
    boya(/[A-Za-zÇĞİÖŞÜçğıöşü_]\w*(?=\()/g, "#dcdcaa");
    boya(TUR, "#4ec9b0");
    boya(ANAHTAR, "#c586c0");
    boya(/\b\d+(\.\d+)?\b/g, "#b5cea8");
    const yorum = s.indexOf("//");
    if (yorum > 0) for (let i = yorum; i < s.length; i++) renkler[i] = "#6a9955";
    let cx = x;
    for (let i = 0; i < s.length; i++) {
      kg.fillStyle = renkler[i];
      kg.fillText(s[i], cx, y);
      cx += kg.measureText(s[i]).width;
    }
  }
  let kodYazilan = 0, kodBekle = 0, kodSure = 0, kodZaman = 0;
  const kodToplam = KOD.reduce((t, s) => t + s.length + 1, 0);
  function kodCiz(dt) {
    kodSure += dt;
    kodZaman += dt;
    if (kodSure < 0.05) return;
    const adim = kodSure;
    kodSure = 0;
    if (kodYazilan >= kodToplam) { kodBekle += adim; if (kodBekle > 4) { kodYazilan = 0; kodBekle = 0; } }
    else kodYazilan = Math.min(kodToplam, kodYazilan + Math.max(1, Math.round(adim * 38)));
    const w = KT_W, h = KT_H;
    kg.fillStyle = "#1e1e1e"; kg.fillRect(0, 0, w, h);
    // etkinlik çubuğu: dosyalar, arama, git, hata ayıklama simgeleri
    const AB = 48;
    kg.fillStyle = "#2c2c2c"; kg.fillRect(0, 0, AB, h);
    kg.fillStyle = "#e5e5e5"; kg.fillRect(0, 60, 3, 40);
    for (let i = 0; i < 4; i++) {
      kg.strokeStyle = i === 0 ? "#e5e5e5" : "#858585";
      kg.lineWidth = 2.5;
      kg.strokeRect(14, 68 + i * 56, 20, 24);
    }
    // sekme çubuğu
    kg.fillStyle = "#252526"; kg.fillRect(AB, 0, w - AB, 52);
    kg.fillStyle = "#1e1e1e"; kg.fillRect(AB, 0, 196, 52);
    kg.fillStyle = "#38bdf8"; kg.fillRect(AB, 0, 196, 3);
    kg.font = "500 22px ui-monospace, Menlo, Consolas, monospace";
    kg.textAlign = "left";
    kg.fillStyle = "#00add8"; kg.fillText("Go", AB + 14, 34);
    kg.fillStyle = "#e5e5e5"; kg.fillText("kalman.go", AB + 52, 34);
    kg.fillStyle = "#8a8a8a"; kg.fillText("olcum.go", AB + 214, 34);
    // satırlar
    kg.font = "500 21px ui-monospace, Menlo, Consolas, monospace";
    let kalan = kodYazilan, y = 92, imlec = null;
    for (let i = 0; i < KOD.length; i++) {
      kg.fillStyle = "#5a5a5a";
      kg.textAlign = "right";
      kg.fillText(String(i + 1), AB + 40, y);
      kg.textAlign = "left";
      const satir = KOD[i].replace(/\t/g, "    ");
      const n = Math.min(satir.length, Math.max(0, kalan));
      kodSatir(satir.slice(0, n), AB + 56, y);
      if (imlec === null && kalan <= satir.length) imlec = [AB + 56 + kg.measureText(satir.slice(0, n)).width, y];
      kalan -= satir.length + 1;
      y += 29;
    }
    if (imlec && Math.floor(kodZaman * 2) % 2 === 0) { kg.fillStyle = "#aeafad"; kg.fillRect(imlec[0] + 1, imlec[1] - 19, 2, 24); }
    // durum çubuğu
    kg.fillStyle = "#007acc"; kg.fillRect(0, h - 36, w, 36);
    kg.fillStyle = "#fff"; kg.font = "500 18px ui-monospace, Menlo, Consolas, monospace";
    kg.fillText("⎇ main", 14, h - 12);
    kg.textAlign = "right";
    kg.fillText("Go 1.22  UTF-8  ✓ 0 hata", w - 14, h - 12);
    kodDoku.needsUpdate = true;
  }
  if (azHareket) kodYazilan = kodToplam;
  kodCiz(1);

  // Masa matı: klavye ile fareyi tek parça koyu keçe üstünde toplar
  const ped = mesh(kutu(0.86, 0.003, 0.28, 0.02), mat(0x24272d, { roughness: 1 }), 0.07, MASA_Y + 0.0015, 0.14);
  sahne.add(ped);

  // Klavye: uzay grisi alüminyum gövde, alçak profilli tuşlar, gece tuş aralarından sızan beyaz arka ışık
  const klavye = new THREE.Group();
  klavye.add(mesh(kutu(0.44, 0.014, 0.135, 0.007), alu, 0, 0.007, 0));
  klavye.add(mesh(new THREE.BoxGeometry(0.425, 0.002, 0.12), mat(0x111317, { roughness: 0.8 }), 0, 0.0142, 0));
  const klavyeIsikMat = new THREE.MeshStandardMaterial({ color: 0x111317, emissive: 0xdfe8ff, emissiveIntensity: 0 });
  klavye.add(mesh(new THREE.BoxGeometry(0.42, 0.001, 0.115), klavyeIsikMat, 0, 0.0155, 0));
  const tusMat = mat(0x24272e, { roughness: 0.45 });
  const tusUstMat = mat(0x2e323a, { roughness: 0.4 });
  const tusGeo = kutu(0.021, 0.008, 0.021, 0.004);
  const tusUstGeo = kutu(0.017, 0.0015, 0.017, 0.003);
  const vurguMat = mat(0xd9a441, { roughness: 0.4, metalness: 0.3 });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 17; c++) {
    if (r === 4 && c > 4 && c < 12) continue;
    const x = -0.2 + c * 0.025, z = -0.05 + r * 0.025;
    // Esc ve Enter altın vurgulu
    const ozel = (r === 0 && c === 0) || (r === 2 && c === 16);
    klavye.add(mesh(tusGeo, ozel ? vurguMat : tusMat, x, 0.02, z));
    if (!ozel) klavye.add(mesh(tusUstGeo, tusUstMat, x, 0.0245, z));
  }
  klavye.add(mesh(kutu(0.17, 0.008, 0.021, 0.004), tusMat, 0, 0.02, 0.05));
  klavye.position.set(-0.02, MASA_Y + 0.003, 0.13);
  klavye.rotation.x = 0.04;
  sahne.add(klavye);

  // Fare: ergonomik gövde, sol/sağ tuş ayrımı, kaydırma tekerleği ve altında ince ışık çizgisi
  const fare = new THREE.Group();
  const fareGovde = mesh(new THREE.SphereGeometry(0.03, 32, 20), mat(0x1b1d22, { roughness: 0.35, metalness: 0.2 }));
  fareGovde.scale.set(0.95, 0.5, 1.5);
  fare.add(fareGovde);
  fare.add(mesh(new THREE.BoxGeometry(0.0012, 0.004, 0.026), mat(0x050506), 0, 0.0145, -0.018));
  const teker = mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 16), alu, 0, 0.0145, -0.02);
  teker.rotation.z = Math.PI / 2;
  fare.add(teker);
  const fareIsikMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x38bdf8, emissiveIntensity: 0.4 });
  const fareIsik = mesh(new THREE.TorusGeometry(0.028, 0.0012, 6, 40), fareIsikMat, 0, -0.004, 0);
  fareIsik.rotation.x = Math.PI / 2;
  fareIsik.scale.set(1, 1.5, 1);
  fare.add(fareIsik);
  fare.position.set(0.33, MASA_Y + 0.016, 0.15);
  fare.rotation.y = -0.12;
  sahne.add(fare);

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
  fidan.position.set(0.84, MASA_Y, -0.32);
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
  stand.position.set(0.66, MASA_Y, 0.06);
  stand.rotation.y = -0.5;
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
  defter.position.set(0.56, MASA_Y, 0.3);
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

  const bayramSus = bayram ? bayramSusleri(sahne, { SOL_DUVAR_X, TAVAN_Y, MASA_Y, pencere, PW, PH }) : null;

  // ---- Arka duvar, sağ: C2 operasyon ekranı (C2 Map Display) ----
  // Duvara asılı ince çerçeveli büyük ekran; canlı çizilen çevrimdışı harita, izler, yasak bölge ve alarm
  const c2 = new THREE.Group();
  const C2_W = 1.12, C2_H = 0.67;
  c2.add(mesh(kutu(C2_W + 0.03, C2_H + 0.03, 0.035, 0.008), mat(0x111317, { roughness: 0.35, metalness: 0.5 }), 0, 0, 0.0175));
  c2.add(mesh(kutu(0.3, 0.2, 0.02, 0.004), mat(0x1b1d22, { metalness: 0.6, roughness: 0.4 }), 0, 0, 0.01)); // duvar askısı
  const CW = 1280, CH = 764;
  const c2Tuval = document.createElement("canvas");
  c2Tuval.width = CW;
  c2Tuval.height = CH;
  const cg = c2Tuval.getContext("2d");
  const c2Doku = new THREE.CanvasTexture(c2Tuval);
  c2Doku.colorSpace = THREE.SRGBColorSpace;
  c2Doku.anisotropy = 8;
  const c2Ekran = new THREE.Mesh(new THREE.PlaneGeometry(C2_W, C2_H), new THREE.MeshBasicMaterial({ map: c2Doku, toneMapped: false }));
  c2Ekran.position.z = 0.0355;
  c2.add(c2Ekran);
  // ekranın duvara ve masaya vuran soğuk mavi ışığı
  const c2Isik = new THREE.PointLight(0x5aa9ff, 0.25, 1.6, 2);
  c2Isik.position.set(0, 0, 0.35);
  c2.add(c2Isik);
  c2.position.set(0.92, 1.74, -0.595); // eski kitap rafının yeri, diplomanın sağı
  sahne.add(c2);

  // harita alanı solda, bilgi paneli ve olay listesi sağda
  const MW = 960, UST = 34, ALT = 24;
  const ozluRastgele = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const c2Taban = document.createElement("canvas");
  c2Taban.width = CW;
  c2Taban.height = CH;
  {
    const g = c2Taban.getContext("2d");
    g.fillStyle = "#13283d"; // deniz
    g.fillRect(0, 0, MW, CH);
    // kara: doğuda girintili kıyı, batıda iki ada (Ege kıyısını andırır)
    const kara = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.stroke(); };
    g.fillStyle = "#2a3a35";
    g.strokeStyle = "#4d6b62";
    g.lineWidth = 1.5;
    const kiyi = [[MW, 0]];
    for (let y = 0; y <= CH; y += 18) {
      const x = 330 + Math.sin(y * 0.012) * 70 + Math.sin(y * 0.041 + 1) * 28 + (ozluRastgele(y) - 0.5) * 18 - (y > 330 && y < 420 ? 120 : 0);
      kiyi.push([x, y]);
    }
    kiyi.push([MW, CH]);
    kara(kiyi);
    for (const [cx, cy, r] of [[150, 300, 70], [120, 560, 55]]) {
      const ada = [];
      for (let a = 0; a < Math.PI * 2; a += 0.25) ada.push([cx + Math.cos(a) * r * (0.75 + ozluRastgele(a * 9 + cx) * 0.4), cy + Math.sin(a) * r * 0.7 * (0.75 + ozluRastgele(a * 7 + cy) * 0.4)]);
      kara(ada);
    }
    // enlem/boylam ızgarası
    g.strokeStyle = "rgba(140, 180, 210, .08)";
    g.lineWidth = 1;
    for (let x = 0; x < MW; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CH); g.stroke(); }
    for (let y = 0; y < CH; y += 120) { g.beginPath(); g.moveTo(0, y); g.lineTo(MW, y); g.stroke(); }
    // şehirler
    g.font = "500 15px system-ui, sans-serif";
    g.fillStyle = "rgba(220, 230, 235, .75)";
    for (const [ad, x, y] of [["İzmir", 470, 400], ["Manisa", 620, 250], ["Aliağa", 430, 150], ["Torbalı", 560, 560], ["Kuşadası", 470, 690], ["Akhisar", 760, 120], ["Turgutlu", 760, 330], ["Ödemiş", 800, 560]]) {
      g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
      g.fillText(ad, x + 8, y + 5);
    }
    // radar ve menzil halkaları
    g.strokeStyle = "rgba(90, 200, 140, .35)";
    for (const r of [90, 180, 270]) { g.beginPath(); g.arc(470, 400, r, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = "rgba(90, 200, 140, .7)";
    g.font = "600 12px monospace";
    [10, 20, 30].forEach((km, i) => g.fillText(km + " km", 476, 400 - (i + 1) * 90 + 14));
    g.strokeRect(463, 393, 14, 14);
    g.fillText("RADAR", 450, 424);
    // ölçek çubuğu
    g.strokeStyle = g.fillStyle = "rgba(220, 230, 235, .8)";
    g.beginPath(); g.moveTo(20, CH - ALT - 18); g.lineTo(20, CH - ALT - 12); g.lineTo(140, CH - ALT - 12); g.lineTo(140, CH - ALT - 18); g.stroke();
    g.font = "500 13px system-ui, sans-serif";
    g.fillText("20 km", 60, CH - ALT - 20);
    // sağ panel çerçevesi
    g.fillStyle = "#0d1722";
    g.fillRect(MW, 0, CW - MW, CH);
    g.fillStyle = "#162231";
    g.fillRect(MW + 12, UST + 10, CW - MW - 24, 250);
    g.fillRect(MW + 12, UST + 272, CW - MW - 24, CH - UST - ALT - 284);
    // üst araç çubuğu ve alt durum çubuğu
    g.fillStyle = "#1a2433";
    g.fillRect(0, 0, CW, UST);
    g.fillRect(0, CH - ALT, CW, ALT);
    g.font = "500 14px system-ui, sans-serif";
    let x = 10;
    for (const [ad, aktif] of [["Kaydır", 1], ["Mesafe / Kerteriz"], ["Yasak bölge çiz"], ["İz çizgileri"], ["Etiketler"], ["● Kayıt"], ["4×"], ["Canlıya dön"]]) {
      const w = g.measureText(ad).width + 18;
      g.fillStyle = aktif ? "#1f6fb2" : "#25324a";
      g.fillRect(x, 6, w, 22);
      g.fillStyle = "#dbe5f0";
      g.fillText(ad, x + 9, 22);
      x += w + 6;
    }
  }
  const bolgeler = [
    { ad: "Bölge-1", pts: [[540, 230], [640, 190], [690, 300], [585, 345]] },
    { ad: "Bölge-2", pts: [[330, 560], [410, 520], [455, 610], [375, 650]] },
  ];
  const icinde = ([px, py], pts) => {
    let ic = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ic = !ic;
    }
    return ic;
  };
  // kimlik: 0 dost, 1 düşman, 2 bilinmeyen; R- radar izleri, L- veri bağı izleri
  const c2Izler = [
    ["L-1005", 1, 700, 140, -9, 11], ["L-1004", 1, 300, 470, 8, 12], ["L-1000", 0, 610, 360, 6, -8], ["L-1001", 0, 560, 640, 3, -12],
    ["L-1007", 0, 260, 330, 10, 4], ["R-214", 2, 700, 420, -12, -4], ["R-149", 2, 640, 520, -9, 7], ["R-53", 2, 380, 250, 11, 6],
    ["R-22", 2, 420, 330, 12, -3], ["R-9", 2, 560, 470, -6, -10],
  ].map(([ad, kimlik, x, y, vx, vy]) => ({ ad, kimlik, x, y, vx, vy, iz: [], bolge: null }));
  const KIMLIK = [["Dost", "#38bdf8"], ["Düşman", "#f43f5e"], ["Bilinmeyen", "#facc15"]];
  const olaylar = [];
  let alarm = null, c2Saat = 13 * 3600 + 55 * 60 + 30, c2Bekle = 0, c2Yanip = 0, seciliIz = c2Izler[0];
  const saatYaz = (s) => [s / 3600, (s / 60) % 60, s % 60].map((n) => String(Math.floor(n)).padStart(2, "0")).join(":");
  function sembol(g, iz) {
    const [, renk] = KIMLIK[iz.kimlik];
    g.strokeStyle = renk;
    g.lineWidth = 2.5;
    g.beginPath();
    if (iz.kimlik === 0) g.arc(iz.x, iz.y, 9, 0, Math.PI * 2);
    else if (iz.kimlik === 1) { g.moveTo(iz.x, iz.y - 11); g.lineTo(iz.x + 11, iz.y); g.lineTo(iz.x, iz.y + 11); g.lineTo(iz.x - 11, iz.y); g.closePath(); }
    else for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) { g.moveTo(iz.x + dx + 5, iz.y + dy); g.arc(iz.x + dx, iz.y + dy, 5, 0, Math.PI * 2); }
    g.stroke();
  }
  function c2Ciz(dt) {
    c2Bekle -= dt;
    if (c2Bekle > 0) return;
    const adim = 0.12 - c2Bekle; // ~8 kare/sn yeterli; dokuyu her karede yüklemeyelim
    c2Bekle = 0.12;
    c2Saat += adim * 4; // kayıttan 4× tekrar
    c2Yanip += adim;
    for (const iz of c2Izler) {
      iz.x += iz.vx * adim;
      iz.y += iz.vy * adim;
      if (iz.x < 40 || iz.x > MW - 40) iz.vx = -iz.vx;
      if (iz.y < UST + 40 || iz.y > CH - ALT - 40) iz.vy = -iz.vy;
      iz.iz.push([iz.x, iz.y]);
      if (iz.iz.length > 40) iz.iz.shift();
      const yeni = bolgeler.find((b) => icinde([iz.x, iz.y], b.pts))?.ad ?? null;
      if (yeni !== iz.bolge) {
        const zaman = saatYaz(c2Saat);
        if (yeni && iz.kimlik === 1) {
          alarm = { zaman, metin: `${iz.ad} (Düşman) yasak bölgeye girdi: ${yeni}`, sure: 6 };
          olaylar.unshift([zaman, "ALARM", `${iz.ad} (Düşman) yasak bölgeye girdi: ${yeni}`]);
          seciliIz = iz;
        } else if (yeni) olaylar.unshift([zaman, "UYARI", `${iz.ad} (${KIMLIK[iz.kimlik][0]}) yasak bölge içinde: ${yeni}`]);
        else olaylar.unshift([zaman, "BİLGİ", `${iz.ad} yasak bölgeden çıktı: ${iz.bolge}`]);
        if (olaylar.length > 9) olaylar.pop();
        iz.bolge = yeni;
      }
    }
    if (alarm && (alarm.sure -= adim) <= 0) alarm = null;

    cg.drawImage(c2Taban, 0, 0);
    // yasak bölgeler: içinde düşman varsa yanıp söner
    for (const b of bolgeler) {
      const ihlal = c2Izler.some((iz) => iz.bolge === b.ad && iz.kimlik === 1);
      cg.fillStyle = ihlal && Math.sin(c2Yanip * 9) > 0 ? "rgba(244, 63, 94, .45)" : "rgba(244, 63, 94, .22)";
      cg.strokeStyle = "#f43f5e";
      cg.lineWidth = 2;
      cg.beginPath();
      b.pts.forEach(([x, y], i) => (i ? cg.lineTo(x, y) : cg.moveTo(x, y)));
      cg.closePath();
      cg.fill();
      cg.stroke();
      cg.fillStyle = "#fecdd3";
      cg.font = "700 14px system-ui, sans-serif";
      cg.fillText(b.ad, b.pts[0][0] + 10, b.pts[0][1] + 40);
    }
    // izler: solan iz çizgisi, 60 sn hız vektörü, sembol ve etiket
    cg.save();
    cg.beginPath();
    cg.rect(0, UST, MW, CH - UST - ALT);
    cg.clip();
    for (const iz of c2Izler) {
      const renk = KIMLIK[iz.kimlik][1];
      iz.iz.forEach(([x, y], i) => {
        cg.globalAlpha = (i / iz.iz.length) * 0.6;
        cg.fillStyle = renk;
        cg.fillRect(x - 1.5, y - 1.5, 3, 3);
      });
      cg.globalAlpha = 1;
      cg.strokeStyle = renk;
      cg.lineWidth = 1.5;
      cg.beginPath();
      cg.moveTo(iz.x, iz.y);
      cg.lineTo(iz.x + iz.vx * 5, iz.y + iz.vy * 5);
      cg.stroke();
      sembol(cg, iz);
      const hiz = Math.round(Math.hypot(iz.vx, iz.vy) * 22), rota = Math.round((Math.atan2(iz.vx, -iz.vy) * 180 / Math.PI + 360) % 360);
      cg.fillStyle = "rgba(235, 240, 245, .9)";
      cg.font = "600 13px monospace";
      cg.fillText(`${iz.ad}  ${hiz}kt ${String(rota).padStart(3, "0")}°`, iz.x + 14, iz.y - 8);
      if (iz === seciliIz) {
        cg.strokeStyle = "#e2e8f0";
        cg.lineWidth = 1.5;
        cg.strokeRect(iz.x - 16, iz.y - 16, 32, 32);
      }
    }
    cg.restore();
    // alarm bandı
    if (alarm) {
      cg.fillStyle = Math.sin(c2Yanip * 6) > -0.3 ? "#b91c1c" : "#7f1d1d";
      cg.fillRect(30, UST + 14, MW - 60, 38);
      cg.fillStyle = "#fff";
      cg.font = "700 17px monospace";
      cg.fillText(`⚠ ALARM  ${alarm.zaman}  ${alarm.metin}`, 46, UST + 39);
    }
    // bilgi paneli
    const px = MW + 26;
    cg.fillStyle = "#162231";
    cg.fillRect(MW + 12, UST + 10, CW - MW - 24, 250);
    cg.fillStyle = "#e2e8f0";
    cg.font = "700 19px system-ui, sans-serif";
    cg.fillText(`Hedef ${seciliIz.ad}`, px, UST + 42);
    cg.font = "500 15px monospace";
    const [kimlikAd, kimlikRenk] = KIMLIK[seciliIz.kimlik];
    const satirlar = [
      ["Kimlik", kimlikAd, kimlikRenk],
      ["Konum", `${(38.9 - seciliIz.y / 900).toFixed(4)}° K`],
      ["", `${(26.6 + seciliIz.x / 700).toFixed(4)}° D`],
      ["Hız", `${Math.round(Math.hypot(seciliIz.vx, seciliIz.vy) * 22)} kt`],
      ["Rota", `${Math.round((Math.atan2(seciliIz.vx, -seciliIz.vy) * 180 / Math.PI + 360) % 360)}°`],
      ["Radardan", `${(Math.hypot(seciliIz.x - 470, seciliIz.y - 400) / 9).toFixed(1)} km`],
      ["Bölge", seciliIz.bolge ?? "-"],
      ["Güncelleme", saatYaz(c2Saat)],
    ];
    satirlar.forEach(([a, d, renk], i) => {
      cg.fillStyle = "rgba(148, 163, 184, .9)";
      cg.fillText(a, px, UST + 72 + i * 23);
      cg.fillStyle = renk ?? "#e2e8f0";
      cg.fillText(d, px + 110, UST + 72 + i * 23);
    });
    // olay listesi
    cg.fillStyle = "#162231";
    cg.fillRect(MW + 12, UST + 272, CW - MW - 24, CH - UST - ALT - 284);
    cg.fillStyle = "#e2e8f0";
    cg.font = "700 18px system-ui, sans-serif";
    cg.fillText("Olay listesi", px, UST + 302);
    cg.font = "500 13px monospace";
    olaylar.forEach(([zaman, tur, metin], i) => {
      cg.fillStyle = tur === "ALARM" ? "#fb7185" : tur === "UYARI" ? "#fde047" : "#cbd5e1";
      const y = UST + 332 + i * 40;
      cg.fillText(`${zaman} ${tur}`, px, y);
      cg.fillText(metin.length > 30 ? metin.slice(0, 29) + "…" : metin, px, y + 17);
    });
    // durum çubuğu
    cg.fillStyle = "#1a2433";
    cg.fillRect(0, CH - ALT, CW, ALT);
    cg.fillStyle = "rgba(203, 213, 225, .85)";
    cg.font = "500 13px monospace";
    cg.textAlign = "right";
    cg.fillText(`TEKRAR · ${c2Izler.length} hedef · RDR1 1501 pkt, 0 kayıp · TRK1 40 pkt · ${saatYaz(c2Saat)}`, CW - 14, CH - 7);
    cg.textAlign = "left";
    c2Doku.needsUpdate = true;
  }
  c2Ciz(1);

  // ---- Arka duvar, C2 ekranının sağı: Ronaldo poster duvarı ----
  // Altı siyah çerçeve iki sıra hâlinde; ortadaki büyük çerçeve Kyiv 2018 finali.
  // Fotoğraflar Wikimedia Commons'tan, CC lisanslı (assets/posterler/, künye README'de ve her posterin altında).
  // Poster tuvale önce fotoğrafsız çizilir, fotoğraf yüklenince yeniden çizilir.
  const galeri = new THREE.Group();
  const posterCerceveMat = mat(0x111215, { roughness: 0.45, metalness: 0.2 });
  const POSTER_PX = 1000; // poster dokusunda metre başına piksel
  const AGIR = "'Inter', 'Segoe UI', system-ui, sans-serif";
  const SERIF = "Georgia, 'Times New Roman', serif";

  /** Fotoğrafı alana sığdırıp kırpar (odak: 0-1 arası yatay/dikey kaydırma); fotoğraf yoksa koyu degrade. */
  function fotoAlani(g, x, y, w, h, foto, odak = [0.5, 0.5], yedek = "#22252c") {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    if (foto) {
      const o = Math.max(w / foto.width, h / foto.height);
      const fw = foto.width * o, fh = foto.height * o;
      g.drawImage(foto, x + (w - fw) * odak[0], y + (h - fh) * odak[1], fw, fh);
    } else {
      const d = g.createLinearGradient(x, y, x, y + h);
      d.addColorStop(0, yedek); d.addColorStop(1, "#0c0d10");
      g.fillStyle = d; g.fillRect(x, y, w, h);
    }
    g.restore();
  }

  /** Alandaki pikselleri iki renk arasına eşler (duotone); sepya, kırmızı ve gece mavisi baskılar için. */
  function cifttonla(g, x, y, w, h, koyu, acik, karisim = 1) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const v = g.getImageData(x, y, w, h), d = v.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = Math.min(1, ((d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255) * 1.08);
      for (let k = 0; k < 3; k++) d[i + k] = d[i + k] * (1 - karisim) + (koyu[k] + (acik[k] - koyu[k]) * l) * karisim;
    }
    g.putImageData(v, x, y);
  }

  /** Baskı dokusu: ince gren ve kenarlara doğru kararma. */
  function gren(g, w, h, yogun = 0.1, kenar = 0.55) {
    for (let i = 0; i < (w * h) / 90; i++) {
      g.fillStyle = `rgba(${ozluRastgele(i) > 0.5 ? "255,255,255" : "0,0,0"},${ozluRastgele(i * 1.7) * yogun})`;
      g.fillRect(ozluRastgele(i * 3.1) * w, ozluRastgele(i * 7.3) * h, 2, 2);
    }
    const k = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    k.addColorStop(0, "rgba(0,0,0,0)"); k.addColorStop(1, `rgba(0,0,0,${kenar})`);
    g.fillStyle = k; g.fillRect(0, 0, w, h);
  }

  /** Fotoğrafa kontrast ve doygunluk verir; renkli, çarpıcı baskılar için. */
  function canlandir(g, x, y, w, h, kontrast = 1.25, doygunluk = 1.3, isitma = 0) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const v = g.getImageData(x, y, w, h), d = v.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      for (let k = 0; k < 3; k++) {
        let c = l + (d[i + k] - l) * doygunluk;
        c = (c - 128) * kontrast + 128 + (k === 0 ? isitma : k === 2 ? -isitma : 0);
        d[i + k] = c < 0 ? 0 : c > 255 ? 255 : c;
      }
    }
    g.putImageData(v, x, y);
  }

  /** Dar, sıkışık başlık yazısı: yatayda daraltılmış kalın font. */
  function sikiYazi(g, metin, x, y, boy, { renk = "#fff", hiza = "left", daralt = 0.78, kontur = 0 } = {}) {
    g.save(); g.translate(x, y); g.scale(daralt, 1);
    g.font = `900 ${boy}px ${AGIR}`; g.textAlign = hiza;
    if (kontur) { g.lineWidth = kontur; g.strokeStyle = renk; g.strokeText(metin, 0, 0); }
    else { g.fillStyle = renk; g.fillText(metin, 0, 0); }
    g.restore();
  }

  function kunye(g, w, h, metin, renk = "rgba(255,255,255,.55)") {
    g.fillStyle = renk; g.font = `500 ${w * 0.018}px ${AGIR}`; g.textAlign = "right";
    g.fillText(metin, w * 0.97, h * 0.988);
  }

  const POSTERLER = [
    {
      // sol üst: eski baskı. Sepya çift ton, gren ve yıpranmış kenar; üstte dev CR7, altta isim şeridi
      ad: "sepya", w: 0.3, h: 0.4, x: -0.41, y: 0.255, odak: [0.5, 0.25],
      kunye: "Foto: KANO PHOTO · CC BY-SA 2.0",
      ciz(g, w, h, foto) {
        g.fillStyle = "#e4d2b0"; g.fillRect(0, 0, w, h);
        fotoAlani(g, w * 0.06, h * 0.05, w * 0.88, h * 0.78, foto, this.odak, "#7a5a33");
        if (foto) cifttonla(g, w * 0.06, h * 0.05, w * 0.88, h * 0.78, [46, 28, 12], [236, 214, 170]);
        const ust = g.createLinearGradient(0, h * 0.05, 0, h * 0.3);
        ust.addColorStop(0, "rgba(40,24,10,.75)"); ust.addColorStop(1, "rgba(40,24,10,0)");
        g.fillStyle = ust; g.fillRect(w * 0.06, h * 0.05, w * 0.88, h * 0.25);
        sikiYazi(g, "CR7", w * 0.1, h * 0.19, w * 0.27, { renk: "#f3e6c8" });
        g.fillStyle = "#f3e6c8"; g.font = `700 ${w * 0.034}px ${AGIR}`; g.textAlign = "right"; g.letterSpacing = `${w * 0.008}px`;
        g.fillText("MADRİD", w * 0.9, h * 0.11); g.fillText("2009", w * 0.9, h * 0.145);
        g.letterSpacing = "0px";
        sikiYazi(g, "CRISTIANO RONALDO", w / 2, h * 0.92, w * 0.115, { renk: "#2e1c0b", hiza: "center", daralt: 0.62 });
        g.fillStyle = "#2e1c0b"; g.fillRect(w * 0.06, h * 0.845, w * 0.88, h * 0.004);
        gren(g, w, h, 0.14, 0.45);
        // yıpranmış kenar: kenar boyunca düzensiz açık lekeler
        for (let i = 0; i < 220; i++) {
          const t = ozluRastgele(i * 9.1), yan = Math.floor(ozluRastgele(i * 4.4) * 4), r = w * (0.004 + ozluRastgele(i * 2.2) * 0.012);
          const [px, py] = [[t * w, 0], [w, t * h], [t * w, h], [0, t * h]][yan];
          g.fillStyle = "rgba(240,226,196,.9)"; g.beginPath(); g.arc(px, py, r * 2, 0, Math.PI * 2); g.fill();
        }
        kunye(g, w, h, this.kunye, "rgba(46,28,11,.6)");
      },
    },
    {
      // sol alt: krem kâğıt, solda kalın isim, sağda ince numara; fotoğraf beyaz paspartulu, altta kariyer satırı
      ad: "bernabeu", w: 0.3, h: 0.4, x: -0.41, y: -0.205, odak: [0.32, 0.6],
      kunye: "Foto: Jan SOLO · CC BY-SA 2.0",
      ciz(g, w, h, foto) {
        g.fillStyle = "#f2ede2"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#1a1b1f"; g.textAlign = "left"; g.font = `800 ${w * 0.105}px ${AGIR}`;
        g.fillText("Cristiano", w * 0.08, h * 0.12); g.fillText("Ronaldo", w * 0.08, h * 0.205);
        g.font = `200 ${w * 0.2}px ${AGIR}`; g.textAlign = "right"; g.fillStyle = "#b3182a";
        g.fillText("7", w * 0.92, h * 0.2);
        fotoAlani(g, w * 0.08, h * 0.25, w * 0.84, h * 0.6, foto, this.odak);
        g.fillStyle = "#1a1b1f"; g.textAlign = "left"; g.font = `800 ${w * 0.06}px ${AGIR}`;
        g.fillText("BERNABÉU", w * 0.08, h * 0.915);
        g.font = `500 ${w * 0.028}px ${AGIR}`; g.fillStyle = "#55565c";
        g.fillText("450 GOL · 438 MAÇ · 4 ŞAMPİYONLAR LİGİ", w * 0.08, h * 0.95);
        gren(g, w, h, 0.05, 0.12);
        kunye(g, w, h, this.kunye, "rgba(26,27,31,.5)");
      },
    },
    {
      // orta üst (büyük): 2018 finali. Renkli, sert kontrastlı portre; üstte altın FINAL, altta altın 2018
      ad: "kyiv", w: 0.42, h: 0.5, x: 0, y: 0.305, odak: [0.5, 0.12],
      kunye: "Foto: Антон Зайцев · CC BY-SA 3.0",
      ciz(g, w, h, foto) {
        g.fillStyle = "#05070f"; g.fillRect(0, 0, w, h);
        fotoAlani(g, 0, h * 0.08, w, h * 0.92, foto, this.odak, "#1b2347");
        if (foto) canlandir(g, 0, h * 0.08, w, h * 0.92, 1.35, 1.15, -6);
        // sahne ışığı: sol üstten süzülen soğuk huzme, kenarlarda derin karanlık
        const huzme = g.createLinearGradient(0, 0, w * 0.8, h * 0.6);
        huzme.addColorStop(0, "rgba(140,180,255,.35)"); huzme.addColorStop(0.5, "rgba(140,180,255,0)");
        g.globalCompositeOperation = "screen"; g.fillStyle = huzme; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over";
        const ust = g.createLinearGradient(0, 0, 0, h * 0.3);
        ust.addColorStop(0, "#05070f"); ust.addColorStop(1, "rgba(5,7,15,0)");
        g.fillStyle = ust; g.fillRect(0, 0, w, h * 0.3);
        const alt = g.createLinearGradient(0, h * 0.5, 0, h);
        alt.addColorStop(0, "rgba(5,7,15,0)"); alt.addColorStop(0.55, "rgba(5,7,15,.85)"); alt.addColorStop(1, "#05070f");
        g.fillStyle = alt; g.fillRect(0, h * 0.5, w, h * 0.5);
        // altın FINAL ve yanlarında ince çizgiler
        const altin = g.createLinearGradient(0, h * 0.04, 0, h * 0.11);
        altin.addColorStop(0, "#fff1c1"); altin.addColorStop(0.5, "#e3b04b"); altin.addColorStop(1, "#a87420");
        g.fillStyle = altin; g.font = `800 ${w * 0.07}px ${AGIR}`; g.textAlign = "center"; g.letterSpacing = `${w * 0.06}px`;
        g.fillText("FINAL", w / 2 + w * 0.03, h * 0.095); g.letterSpacing = "0px";
        g.fillStyle = "#e3b04b"; g.fillRect(w * 0.12, h * 0.078, w * 0.2, h * 0.003); g.fillRect(w * 0.68, h * 0.078, w * 0.2, h * 0.003);
        // altta altın 2018
        g.save(); g.shadowColor = "rgba(0,0,0,.85)"; g.shadowBlur = w * 0.03;
        sikiYazi(g, "2018", w / 2, h * 0.9, w * 0.2, { renk: altin, hiza: "center", daralt: 0.9 });
        g.restore();
        g.fillStyle = "rgba(255,255,255,.85)"; g.font = `700 ${w * 0.026}px ${AGIR}`; g.textAlign = "center";
        g.letterSpacing = `${w * 0.014}px`; g.fillText("26 MAYIS 2018 · 13. KUPA · NO 7", w / 2, h * 0.955); g.letterSpacing = "0px";
        gren(g, w, h, 0.07, 0.45);
        kunye(g, w, h, this.kunye);
      },
    },
    {
      // orta alt (yatay): renkli, karanlıktan çıkan portre sağda; solda büyük, sıkışık söz, "THE BEST" kırmızı
      ad: "soz", w: 0.42, h: 0.32, x: 0, y: -0.165, odak: [0.45, 0.3],
      kunye: "Foto: Tsutomu Takasu · CC BY 2.0",
      ciz(g, w, h, foto) {
        g.fillStyle = "#07080b"; g.fillRect(0, 0, w, h);
        fotoAlani(g, w * 0.4, 0, w * 0.6, h, foto, this.odak, "#4a0d14");
        if (foto) canlandir(g, w * 0.4, 0, w * 0.6, h, 1.4, 1.35, 8);
        const gec = g.createLinearGradient(w * 0.4, 0, w * 0.66, 0);
        gec.addColorStop(0, "#07080b"); gec.addColorStop(1, "rgba(7,8,11,0)");
        g.fillStyle = gec; g.fillRect(w * 0.4, 0, w * 0.26, h);
        // kırmızı kenar ışığı
        const kenar = g.createRadialGradient(w * 1.02, h * 0.5, 0, w * 1.02, h * 0.5, w * 0.5);
        kenar.addColorStop(0, "rgba(220,30,45,.45)"); kenar.addColorStop(1, "rgba(220,30,45,0)");
        g.globalCompositeOperation = "screen"; g.fillStyle = kenar; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over";
        g.fillStyle = "rgba(255,255,255,.55)"; g.font = `italic ${w * 0.05}px ${SERIF}`; g.textAlign = "left";
        g.fillText("“", w * 0.055, h * 0.2);
        sikiYazi(g, "IN MY MIND", w * 0.06, h * 0.36, w * 0.095, { renk: "#f3efe4", daralt: 0.72 });
        sikiYazi(g, "I'M ALWAYS", w * 0.06, h * 0.52, w * 0.095, { renk: "#f3efe4", daralt: 0.72 });
        sikiYazi(g, "THE BEST", w * 0.06, h * 0.74, w * 0.14, { renk: "#e0182d", daralt: 0.72 });
        g.fillStyle = "#e0182d"; g.fillRect(w * 0.06, h * 0.8, w * 0.05, h * 0.01);
        g.fillStyle = "rgba(243,239,228,.75)"; g.font = `700 ${w * 0.024}px ${AGIR}`; g.letterSpacing = `${w * 0.008}px`;
        g.fillText("CRISTIANO RONALDO", w * 0.13, h * 0.81); g.letterSpacing = "0px";
        gren(g, w, h, 0.06, 0.45);
        kunye(g, w, h, this.kunye);
      },
    },
    {
      // sağ üst: kırmızı baskı. Gol sevinci tam sayfa, sert kırmızı çift ton; arkada dev saydam 7, altta kalın CR7 ve hız çizgileri
      ad: "cr7", w: 0.3, h: 0.4, x: 0.41, y: 0.255, odak: [0.7, 0.35],
      kunye: "Foto: Alejandro Ramos · CC BY-SA 2.0",
      ciz(g, w, h, foto) {
        g.fillStyle = "#7d0a12"; g.fillRect(0, 0, w, h);
        fotoAlani(g, 0, 0, w, h, foto, this.odak, "#7d0a12");
        if (foto) { canlandir(g, 0, 0, w, h, 1.3, 1.1); cifttonla(g, 0, 0, w, h, [30, 0, 6], [255, 228, 214], 0.75); }
        // dev 7, fotoğrafın üstünde ekran karışımıyla parlar
        g.globalCompositeOperation = "screen";
        g.fillStyle = "rgba(255,60,70,.35)"; g.font = `900 ${h * 0.95}px ${AGIR}`; g.textAlign = "center";
        g.fillText("7", w * 0.5, h * 0.82);
        g.globalCompositeOperation = "source-over";
        // hız çizgileri
        for (let i = 0; i < 26; i++) {
          const y = h * ozluRastgele(i * 4.7), uz = w * (0.15 + ozluRastgele(i * 2.3) * 0.35);
          g.fillStyle = `rgba(255,255,255,${0.08 + ozluRastgele(i) * 0.12})`;
          g.fillRect(ozluRastgele(i * 9.9) > 0.5 ? 0 : w - uz, y, uz, h * 0.003);
        }
        const alt = g.createLinearGradient(0, h * 0.62, 0, h);
        alt.addColorStop(0, "rgba(40,0,6,0)"); alt.addColorStop(1, "rgba(40,0,6,.95)");
        g.fillStyle = alt; g.fillRect(0, h * 0.62, w, h * 0.38);
        sikiYazi(g, "CR7", w / 2 + w * 0.012, h * 0.93, w * 0.42, { renk: "#120005", hiza: "center", daralt: 0.88 });
        sikiYazi(g, "CR7", w / 2, h * 0.925, w * 0.42, { renk: "#ffffff", hiza: "center", daralt: 0.88 });
        g.fillStyle = "#ffffff"; g.font = `800 ${w * 0.045}px ${AGIR}`; g.textAlign = "left"; g.letterSpacing = `${w * 0.02}px`;
        g.fillText("SIUUU", w * 0.07, h * 0.08); g.letterSpacing = "0px";
        g.textAlign = "right"; g.font = `600 ${w * 0.03}px ${AGIR}`; g.fillStyle = "rgba(255,255,255,.8)";
        g.fillText("BERNABÉU · 2010", w * 0.93, h * 0.08);
        gren(g, w, h, 0.09, 0.4);
        kunye(g, w, h, this.kunye);
      },
    },
    {
      // sağ alt: sözlük maddesi "DİSİPLİN"; altında soğuk tonlu frikik anı
      ad: "frikik", w: 0.3, h: 0.4, x: 0.41, y: -0.205, odak: [0.46, 0.5],
      kunye: "Foto: Sdo216 · CC BY-SA 3.0",
      ciz(g, w, h, foto) {
        g.fillStyle = "#16171b"; g.fillRect(0, 0, w, h);
        sikiYazi(g, "DİSİPLİN", w * 0.07, h * 0.13, w * 0.19, { renk: "#ecebe6", daralt: 0.75 });
        g.fillStyle = "rgba(236,235,230,.7)"; g.font = `italic ${w * 0.04}px ${SERIF}`; g.textAlign = "left";
        g.fillText("isim · /di-si-plin/", w * 0.07, h * 0.18);
        g.fillStyle = "rgba(236,235,230,.35)"; g.fillRect(w * 0.07, h * 0.2, w * 0.86, 2);
        g.fillStyle = "#ecebe6"; g.font = `${w * 0.042}px ${SERIF}`;
        ["Kimse bakmazken de sahaya ilk", "çıkmak; yeteneği her sabah", "yeniden hak etmek."].forEach((t, i) => g.fillText(t, w * 0.07, h * (0.25 + i * 0.045)));
        fotoAlani(g, w * 0.07, h * 0.42, w * 0.86, h * 0.46, foto, this.odak);
        if (foto) cifttonla(g, w * 0.07, h * 0.42, w * 0.86, h * 0.46, [10, 16, 22], [226, 238, 240], 0.55);
        g.fillStyle = "#d21f2b"; g.fillRect(w * 0.07, h * 0.9, w * 0.1, h * 0.006);
        g.fillStyle = "#ecebe6"; g.font = `700 ${w * 0.034}px ${AGIR}`; g.letterSpacing = `${w * 0.008}px`;
        g.fillText("OLD TRAFFORD · 2009", w * 0.2, h * 0.906); g.letterSpacing = "0px";
        gren(g, w, h, 0.06, 0.35);
        kunye(g, w, h, this.kunye);
      },
    },
  ];

  function posterDokusu(p, foto) {
    return tuvalDokusu(Math.round(p.w * POSTER_PX * 2), Math.round(p.h * POSTER_PX * 2), (g, w, h) => p.ciz(g, w, h, foto));
  }

  /** Dört çıtadan çerçeve: yerel merkez (0,0), ön yüzü +z. */
  function cerceve(w, h, kalin, derin, malzeme) {
    const c = new THREE.Group();
    c.add(mesh(kutu(w, kalin, derin, 0.003), malzeme, 0, h / 2 - kalin / 2, derin / 2));
    c.add(mesh(kutu(w, kalin, derin, 0.003), malzeme, 0, -h / 2 + kalin / 2, derin / 2));
    c.add(mesh(kutu(kalin, h - kalin * 2, derin, 0.003), malzeme, -w / 2 + kalin / 2, 0, derin / 2));
    c.add(mesh(kutu(kalin, h - kalin * 2, derin, 0.003), malzeme, w / 2 - kalin / 2, 0, derin / 2));
    return c;
  }

  for (const p of POSTERLER) {
    const parca = new THREE.Group();
    parca.position.set(p.x, p.y, 0);
    const K = 0.018;
    parca.add(cerceve(p.w, p.h, K, 0.024, posterCerceveMat));
    const m = new THREE.MeshStandardMaterial({ map: posterDokusu(p, null), roughness: 0.6 });
    parca.add(mesh(new THREE.PlaneGeometry(p.w - K * 2, p.h - K * 2), m, 0, 0, 0.006));
    galeri.add(parca);
    resimYukle(`assets/posterler/${p.ad}.jpg`).then((foto) => {
      if (!foto) return;
      m.map.dispose();
      m.map = posterDokusu(p, foto);
      m.needsUpdate = true;
    });
  }
  // C2 ekranıyla arasında bir el boşluk; alt sıra kabinin üstünden görünür
  const GALERI_OLCEK = 0.8, GALERI_W = 1.12 * GALERI_OLCEK, GALERI_H = 0.96 * GALERI_OLCEK;
  galeri.scale.setScalar(GALERI_OLCEK);
  galeri.position.set(2.0, 1.65, -0.6); // üst kenar C2 ekranının üst kenarıyla aynı hizada
  sahne.add(galeri);

  // galeriyi tavandan aydınlatan ılık spot: gece belirgin, gündüz hafif; çerçeveler duvara gölge düşürür
  const galeriHedef = new THREE.Object3D();
  galeriHedef.position.set(2.0, 1.63, -0.6);
  sahne.add(galeriHedef);
  const galeriSpotGovde = new THREE.Group();
  galeriSpotGovde.position.set(2.0, TAVAN_Y, 0.25);
  galeriSpotGovde.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 24), mat(0x1d1f26, { metalness: 0.5, roughness: 0.4 }), 0, -0.006, 0));
  const galeriKafa = new THREE.Group();
  galeriKafa.position.y = -0.05;
  const galeriKafaGovde = mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.08, 24), mat(0x1d1f26, { metalness: 0.5, roughness: 0.4 }), 0, -0.04, 0);
  const galeriMercekMat = new THREE.MeshStandardMaterial({ color: 0xffeab0, emissive: 0xffc77a, emissiveIntensity: 0 });
  const galeriMercek = mesh(new THREE.CircleGeometry(0.022, 24), galeriMercekMat, 0, -0.0805, 0);
  galeriMercek.rotation.x = Math.PI / 2;
  galeriKafa.add(galeriKafaGovde, galeriMercek);
  galeriSpotGovde.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8), mat(0x1d1f26), 0, -0.03, 0));
  const galeriYon = galeriHedef.position.clone().sub(v3(2.0, TAVAN_Y - 0.05, 0.25)).normalize();
  galeriKafa.quaternion.setFromUnitVectors(v3(0, -1, 0), galeriYon);
  galeriSpotGovde.add(galeriKafa);
  sahne.add(galeriSpotGovde);
  const galeriSpot = new THREE.SpotLight(0xffd9a0, 0, 3.5, 0.5, 0.6, 1.4);
  galeriSpot.position.set(2.0, TAVAN_Y - 0.05, 0.25).addScaledVector(galeriYon, 0.09);
  galeriSpot.target = galeriHedef;
  galeriSpot.castShadow = true;
  galeriSpot.shadow.mapSize.set(1024, 1024);
  galeriSpot.shadow.bias = -0.0004;
  galeriSpot.shadow.radius = 4;
  sahne.add(galeriSpot);

  // Yetenek kabini: masanın sağında, arka duvara yaslı camlı mini sunucu kabini; her ünite bir yetenek grubu, her yuva bir yetenek
  const pano = new THREE.Group();
  const KAB_W = 0.52, KAB_D = 0.55, KAB_H = 1.14, KAB_Y = 0.07, IC_W = 0.43, UW = IC_W + 0.03;
  const YETENEK_GRUPLARI = [
    ["FRONTEND", "#38bdf8", [["React", "#149eca"], ["Next.js", "#e5e7eb"], ["TypeScript", "#3178c6"], ["Tailwind", "#0e9fb5"], ["Three.js", "#e5e7eb"], ["Phaser", "#8b5cf6"]]],
    ["BACKEND", "#34d399", [["C# / .NET", "#7c5cff"], ["Node.js", "#3c873a"], ["NestJS", "#e0234e"], ["PostgreSQL", "#4f8cc9"], ["Redis", "#d82c20"], ["Claude API", "#c96442"]]],
    ["SİSTEM", "#f59e0b", [["C / C++17", "#3b82f6"], ["Go", "#00add8"], ["Java 21", "#e76f00"], ["STM32", "#03a9f4"], ["FreeRTOS", "#2e7d32"], ["Qt 6", "#41cd52"]]],
    ["ARAÇLAR", "#f472b6", [["Git", "#e44c30"], ["GitHub Actions", "#2088ff"], ["Docker", "#1d63ed"], ["Jest / Vitest", "#c2416b"], ["xUnit", "#8b5cf6"], ["Capacitor", "#119eff"]]],
  ];
  // dış gövde: antrasit toz boya, yanlarda üst ve altta havalandırma yarıkları
  const yanDoku = tuvalDokusu(256, 512, (g, w, h) => {
    g.fillStyle = "#23262d"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(255,255,255,${((y * 13) % 7) / 600})`; g.fillRect(0, y, w, 1); }
    g.fillStyle = "#0c0d10";
    for (const y0 of [30, h - 92]) for (let i = 0; i < 9; i++) g.fillRect(36 + i * 21, y0, 8, 62);
  });
  const kabinGovdeMat = new THREE.MeshStandardMaterial({ map: yanDoku, metalness: 0.55, roughness: 0.42 });
  const kenarMat = mat(0x2c3038, { metalness: 0.7, roughness: 0.3 });
  const icMat = mat(0x0d0f13, { roughness: 0.9 });
  pano.add(mesh(kutu(0.024, KAB_H, KAB_D, 0.01), kabinGovdeMat, -KAB_W / 2 + 0.012, KAB_Y + KAB_H / 2, 0));
  pano.add(mesh(kutu(0.024, KAB_H, KAB_D, 0.01), kabinGovdeMat, KAB_W / 2 - 0.012, KAB_Y + KAB_H / 2, 0));
  pano.add(mesh(new THREE.BoxGeometry(KAB_W - 0.04, KAB_H - 0.04, 0.01), icMat, 0, KAB_Y + KAB_H / 2, -KAB_D / 2 + 0.01));
  pano.add(mesh(new THREE.BoxGeometry(KAB_W - 0.04, 0.02, KAB_D - 0.02), icMat, 0, KAB_Y + 0.01, 0));
  // taç: hafif taşan, yuvarlak kenarlı üst kapak
  pano.add(mesh(kutu(KAB_W + 0.016, 0.034, KAB_D + 0.016, 0.012), kenarMat, 0, KAB_Y + KAB_H + 0.012, 0.004));
  // taban: içeri çekilmiş kaide, gövde havada duruyormuş gibi gölge verir
  pano.add(mesh(kutu(KAB_W - 0.05, KAB_Y, KAB_D - 0.06, 0.008), mat(0x0b0c0f, { roughness: 0.8 }), 0, KAB_Y / 2, -0.01));
  pano.add(mesh(kutu(KAB_W + 0.004, 0.018, KAB_D + 0.004, 0.006), kenarMat, 0, KAB_Y + 0.006, 0.002));

  // rack rayları: önde iki dikme, U delikleriyle
  const rayDoku = tuvalDokusu(32, 512, (g, w, h) => {
    g.fillStyle = "#8d949e"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1c1f25";
    for (let y = 6; y < h; y += 14) g.fillRect(11, y, 10, 7);
  });
  const rayMat = new THREE.MeshStandardMaterial({ map: rayDoku, metalness: 0.7, roughness: 0.4 });
  for (const x of [-IC_W / 2 - 0.01, IC_W / 2 + 0.01]) pano.add(mesh(new THREE.BoxGeometry(0.02, KAB_H - 0.06, 0.01), rayMat, x, KAB_Y + KAB_H / 2, KAB_D / 2 - 0.07));

  // ünite ön yüzleri: fırçalanmış koyu metal, solda grup adı, ortada altı sürücü yuvası
  const ON_Z = KAB_D / 2 - 0.06;
  const UNITE_H = 0.15, UNITE_ARA = 0.01;
  const UTW = 1024, UTH = Math.round((UTW * UNITE_H) / UW);
  const YUVA_W = (UTW - 200) / 3, YUVA_H = (UTH - 66) / 2;
  const yuvaKonum = (i) => [150 + (i % 3) * YUVA_W, 26 + Math.floor(i / 3) * (YUVA_H + 14)];
  function uniteDokusu(baslik, vurgu, yuvalar) {
    return tuvalDokusu(UTW, UTH, (g, w, h) => {
      g.fillStyle = "#24272e"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(255,255,255,${((y * 7) % 11) / 400})`; g.fillRect(0, y, w, 1); }
      g.fillStyle = "#3a3f48"; g.fillRect(0, 0, 36, h); g.fillRect(w - 36, 0, 36, h);
      g.fillStyle = "#8b929c";
      for (const x of [18, w - 18]) for (const y of [36, h - 36]) { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = vurgu; g.fillRect(52, 30, 10, h - 60);
      g.save(); g.translate(104, h / 2); g.rotate(-Math.PI / 2);
      g.fillStyle = "#e5e7eb"; g.font = "800 36px ui-monospace, Menlo, Consolas, monospace"; g.textAlign = "center";
      g.fillText(baslik, 0, 12); g.restore();
      yuvalar.forEach(([ad, renk], i) => {
        const [x, y] = yuvaKonum(i), bw = YUVA_W - 12, bh = YUVA_H;
        g.fillStyle = "#0f1115"; g.fillRect(x, y, bw, bh);
        g.fillStyle = "#2f333b"; g.fillRect(x + 4, y + 4, bw - 8, bh - 8);
        for (let k = 0; k < 4; k++) { g.fillStyle = "#1a1d22"; g.fillRect(x + 14 + k * 9, y + 16, 4, bh - 32); }
        g.fillStyle = renk; g.fillRect(x + 54, y + 18, 6, bh - 36);
        g.fillStyle = "#f1f5f9"; g.textAlign = "left";
        g.font = `700 ${ad.length > 11 ? 22 : ad.length > 8 ? 26 : 32}px system-ui, sans-serif`;
        g.fillText(ad, x + 68, y + bh / 2 + 11);
        g.fillStyle = "#0b0c0f"; g.beginPath(); g.arc(x + bw - 20, y + 22, 8, 0, Math.PI * 2); g.fill();
      });
    });
  }
  const panoLedler = [];
  const ledGeo = new THREE.SphereGeometry(0.004, 10, 8);
  const uniteGovde = mat(0x1d2026, { metalness: 0.5, roughness: 0.5 });
  YETENEK_GRUPLARI.forEach(([baslik, vurgu, yuvalar], s) => {
    const y = 0.98 - s * (UNITE_H + UNITE_ARA);
    const doku = uniteDokusu(baslik, vurgu, yuvalar);
    doku.anisotropy = 8;
    const onMat = new THREE.MeshStandardMaterial({ map: doku, metalness: 0.35, roughness: 0.55 });
    pano.add(mesh(new THREE.BoxGeometry(UW, UNITE_H, 0.4), [uniteGovde, uniteGovde, uniteGovde, uniteGovde, onMat, uniteGovde], 0, y, ON_Z - 0.2));
    yuvalar.forEach((_, i) => {
      const [x0, y0] = yuvaKonum(i);
      const ux = (-0.5 + (x0 + YUVA_W - 12 - 20) / UTW) * UW;
      const uy = y + (0.5 - (y0 + 22) / UTH) * UNITE_H;
      const m = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: i % 4 === 3 ? "#f59e0b" : "#22c55e", emissiveIntensity: 1, roughness: 0.3 });
      pano.add(mesh(ledGeo, m, ux, uy, ON_Z + 0.002));
      panoLedler.push(m);
    });
  });
  // en üstte 1U ağ anahtarı: port ışıkları ve renkli yama kabloları
  const SW_Y = 1.095;
  pano.add(mesh(kutu(UW, 0.042, 0.3, 0.004), mat(0x2b2f37, { metalness: 0.5, roughness: 0.4 }), 0, SW_Y, ON_Z - 0.15));
  const kabloRenk = [0x3b82f6, 0xf59e0b, 0x22c55e, 0xef4444, 0xa855f7, 0x3b82f6, 0xf8fafc];
  kabloRenk.forEach((r, i) => {
    const x = -0.15 + i * 0.045;
    pano.add(mesh(new THREE.BoxGeometry(0.014, 0.012, 0.03), mat(r, { roughness: 0.5 }), x, SW_Y, ON_Z + 0.012));
    const egri = new THREE.CatmullRomCurve3([v3(x, SW_Y, ON_Z + 0.025), v3(x, SW_Y - 0.03, ON_Z + 0.045), v3(IC_W / 2 - 0.02, SW_Y - 0.055 - i * 0.004, ON_Z + 0.03), v3(IC_W / 2 + 0.004, SW_Y - 0.1, ON_Z - 0.05)]);
    pano.add(mesh(new THREE.TubeGeometry(egri, 20, 0.0033, 6), mat(r, { roughness: 0.55 })));
    const m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: "#22c55e", emissiveIntensity: 1 });
    pano.add(mesh(new THREE.BoxGeometry(0.006, 0.004, 0.002), m, x + 0.012, SW_Y + 0.015, ON_Z + 0.001));
    panoLedler.push(m);
  });
  // grup üniteleriyle UPS arasında delikli kör kapak
  const korDoku = tuvalDokusu(1024, 360, (g, w, h) => {
    g.fillStyle = "#2a2d34"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#3a3f48"; g.fillRect(0, 0, 36, h); g.fillRect(w - 36, 0, 36, h);
    g.fillStyle = "#121418";
    for (let y = 40; y < h - 30; y += 22) for (let x = 76 + ((y / 22) % 2) * 11; x < w - 66; x += 22) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
  });
  const korMat = new THREE.MeshStandardMaterial({ map: korDoku, metalness: 0.4, roughness: 0.55 });
  pano.add(mesh(new THREE.BoxGeometry(UW, 0.16, 0.02), [uniteGovde, uniteGovde, uniteGovde, uniteGovde, korMat, uniteGovde], 0, 0.335, ON_Z - 0.01));
  // altta UPS: küçük ekran
  const upsDoku = tuvalDokusu(512, 150, (g, w, h) => {
    g.fillStyle = "#1b1e24"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#0b1a12"; g.fillRect(290, 40, 180, 70);
    g.fillStyle = "#4ade80"; g.font = "700 30px ui-monospace, Menlo, Consolas, monospace"; g.fillText("230V 98%", 298, 87);
    g.fillStyle = "#9ca3af"; g.font = "800 34px system-ui, sans-serif"; g.fillText("UPS 1500", 44, 87);
  });
  const upsMat = new THREE.MeshStandardMaterial({ map: upsDoku, roughness: 0.5, emissiveMap: upsDoku, emissive: 0xffffff, emissiveIntensity: 0.15 });
  const upsGovde = mat(0x1b1e24, { roughness: 0.5 });
  pano.add(mesh(new THREE.BoxGeometry(UW, 0.135, 0.45), [upsGovde, upsGovde, upsGovde, upsGovde, upsMat, upsGovde], 0, 0.175, ON_Z - 0.225));

  // camlı kapı: kalın yuvarlak profil, füme cam, üst kenarda ince mavi ışık şeridi
  const kapiZ = KAB_D / 2 + 0.006;
  const PRF = 0.03;
  const camMat = new THREE.MeshPhysicalMaterial({ color: 0x1c2a38, transparent: true, opacity: 0.2, roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 });
  pano.add(mesh(new THREE.PlaneGeometry(KAB_W - PRF * 2 + 0.01, KAB_H - PRF * 2 + 0.01), camMat, 0, KAB_Y + KAB_H / 2, kapiZ - 0.004));
  // camın üstünde çapraz yansıma çizgileri
  const yansimaDoku = tuvalDokusu(256, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (const [x0, gen, a] of [[-40, 70, 0.1], [60, 18, 0.07], [150, 40, 0.05]]) {
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.beginPath(); g.moveTo(x0, h); g.lineTo(x0 + gen, h); g.lineTo(x0 + gen + 260, 0); g.lineTo(x0 + 260, 0); g.closePath(); g.fill();
    }
  });
  pano.add(mesh(new THREE.PlaneGeometry(KAB_W - PRF * 2 + 0.01, KAB_H - PRF * 2 + 0.01), new THREE.MeshBasicMaterial({ map: yansimaDoku, transparent: true, depthWrite: false }), 0, KAB_Y + KAB_H / 2, kapiZ - 0.003));
  for (const [w, h, x, y] of [[KAB_W, PRF, 0, KAB_Y + KAB_H - PRF / 2], [KAB_W, PRF, 0, KAB_Y + PRF / 2], [PRF, KAB_H - PRF * 2 + 0.002, -KAB_W / 2 + PRF / 2, KAB_Y + KAB_H / 2], [PRF, KAB_H - PRF * 2 + 0.002, KAB_W / 2 - PRF / 2, KAB_Y + KAB_H / 2]]) {
    pano.add(mesh(kutu(w, h, 0.022, 0.008), kenarMat, x, y, kapiZ));
  }
  const seritMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.4 });
  // ışık şeridi kapı profilinin önünde: üstte yatay, solda dikey
  pano.add(mesh(new THREE.BoxGeometry(KAB_W - 0.05, 0.005, 0.003), seritMat, 0, KAB_Y + KAB_H - PRF / 2, kapiZ + 0.012));
  pano.add(mesh(new THREE.BoxGeometry(0.005, KAB_H - 0.05, 0.003), seritMat, -KAB_W / 2 + PRF / 2, KAB_Y + KAB_H / 2, kapiZ + 0.012));
  // dikey kulp ve kilit
  const krom = mat(0xc8ced6, { metalness: 0.95, roughness: 0.18 });
  const kulpX = KAB_W / 2 - PRF / 2;
  pano.add(mesh(kutu(0.012, 0.24, 0.012, 0.005), krom, kulpX, KAB_Y + KAB_H * 0.56, kapiZ + 0.03));
  for (const dy of [-0.11, 0.11]) pano.add(mesh(new THREE.BoxGeometry(0.008, 0.008, 0.024), krom, kulpX, KAB_Y + KAB_H * 0.56 + dy, kapiZ + 0.016));
  const kilit = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 14), krom, kulpX, KAB_Y + KAB_H * 0.56 - 0.16, kapiZ + 0.013);
  kilit.rotation.x = Math.PI / 2;
  pano.add(kilit);
  // taç önünde küçük fırçalanmış etiket
  const kabinEtiketDoku = tuvalDokusu(256, 48, (g, w, h) => {
    g.fillStyle = "#b9c0c9"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1f2329"; g.font = "800 26px ui-monospace, Menlo, Consolas, monospace"; g.textAlign = "center";
    g.fillText("MG · SRV-01", w / 2, 33);
  });
  pano.add(mesh(new THREE.PlaneGeometry(0.11, 0.0206), new THREE.MeshStandardMaterial({ map: kabinEtiketDoku, metalness: 0.6, roughness: 0.35 }), 0, KAB_Y + KAB_H + 0.012, KAB_D / 2 + 0.0125));
  pano.position.set(1.6, 0, -0.6 + KAB_D / 2 + 0.03);
  pano.rotation.y = -0.18;
  sahne.add(pano);


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
    // kavisli kasanın kenarına oturur
    const a = x / KAVIS_R;
    n.position.set(KAVIS_R * Math.sin(a), y, KAVIS_R * (1 - Math.cos(a)) + 0.004);
    n.rotation.set(0, -a, aci);
    monitor.add(n);
  }

  // ---- Dokular: monitör masaüstü, telefon, pencere ----
  const [kadroImg, depomImg, qrImg, ocakImg, okeyImg, ocakSimge, okeySimge] = await Promise.all(
    [...["kadro", "depom", "qr", "ocakbasi", "okey"].map((a) => `assets/${a}/poster.webp`), "assets/ocakbasi/simge.svg", "assets/okey/simge.svg"].map(resimYukle)
  );

  function masaustuDokusu(gece) {
    return tuvalDokusu(1280, 800, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, bayram ? (gece ? "#3a0610" : "#a50d1c") : gece ? "#1b1f3a" : "#5b8def");
      gr.addColorStop(1, bayram ? (gece ? "#7a0a18" : "#e0313f") : gece ? "#4a1d5e" : "#a77bf3");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      if (bayram) {
        // bayram duvar kâğıdı: sağ üstte soluk büyük ay-yıldız, başlığın üstünde kutlama satırı
        g.globalAlpha = 0.16;
        ayYildizCiz(g, 640, 30, 560);
        g.globalAlpha = 1;
        g.fillStyle = "#f3d27a";
        g.font = "700 26px system-ui, sans-serif";
        g.fillText(`29 EKİM  ·  CUMHURİYETİMİZİN ${cumhuriyetYili}. YILI KUTLU OLSUN`, 74, 108);
      }
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
      if (bayram) {
        // bayramda kalenin sol burcunda dalgalanan Türk bayrağı (orta burç pencere kayıtının arkasında kalır)
        const dx = w * 0.18 + 20, dy = h * 0.72 - 99;
        g.fillStyle = gece ? "#9aa0b8" : "#e8e2d6";
        g.fillRect(dx - 1.5, dy - 56, 3, 56);
        g.save();
        g.translate(dx + 1.5, dy - 54);
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(20, -6, 38, 6, 60, -2);
        g.lineTo(60, 38);
        g.bezierCurveTo(38, 46, 20, 34, 0, 40);
        g.closePath();
        g.fillStyle = gece ? "#b3121f" : "#e30a17";
        g.fill();
        g.clip();
        ayYildizCiz(g, 4, 3, 36, gece ? "#e8e0e0" : "#fff");
        g.restore();
      }
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
    galeriSpot.intensity = gece ? 6 : 2.5;
    galeriMercekMat.emissiveIntensity = gece ? 2.5 : 0.4;
    spotMercekMat.emissiveIntensity = gece ? 3 : 0;
    // kadife ışıltısı gündüz pencereden gelen ılık ışıkla canlanır, gece söner
    bayrakMat.sheen = gece ? 0.2 : 0.45;
    bayrakMat.sheenColor.set(gece ? 0x4a0610 : 0xa0202a);
    seritMat.emissiveIntensity = gece ? 1.6 : 0.5;
    arkaIsikMat.opacity = gece ? 0.55 : 0.08;
    bayramSus?.tema(gece);
    klavyeIsikMat.emissiveIntensity = gece ? 0.9 : 0;
    fareIsikMat.emissiveIntensity = gece ? 1.4 : 0.3;
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

  // kabin uzun ve geniş: panel kaydırmasını dengelemek için bakışı biraz sola alır
  function kabinOdak() {
    const o = onden(pano, 1.55, 0.64, 0.08);
    const sol = new THREE.Vector3(-Math.cos(pano.rotation.y), 0, Math.sin(pano.rotation.y)).multiplyScalar(0.24);
    return { kamera: o.kamera.add(sol), hedef: o.hedef.add(sol) };
  }

  // poster kümesi grubun merkezinin biraz üstünde ortalanır (üst sıra daha uzun)
  function galeriOdak() {
    const o = ekranaBak(galeri, galeri, GALERI_W, GALERI_H, kamera.aspect >= 1 ? 1.6 : 1.12);
    const yukari = v(0, 0.075 * GALERI_OLCEK, 0);
    return { kamera: o.kamera.add(yukari), hedef: o.hedef.add(yukari) };
  }

  etkilesimler.push(
    { ad: "monitor", grup: monitor, baslik: "Projeler", odak: () => ekranaBak(monitor, ekran, EKRAN_W, EKRAN_H, kamera.aspect < 1 ? 1.06 : 1.28), yuzey: ekran, w: EKRAN_W, h: EKRAN_H, sehim: EKRAN_SEHIM },
    { ad: "telefon", grup: stand, baslik: "Telefonda oyna", odak: () => ekranaBak(telefon, telEkran, TEL_W, TEL_H, kamera.aspect < 1 ? 1.45 : 1.25), yuzey: telEkran, w: TEL_W, h: TEL_H },
    { ad: "raf", grup: pano, baslik: "Yetenekler", odak: () => kabinOdak(), panel: true },
    { ad: "diploma", grup: diploma, baslik: "Hakkımda", odak: () => ({ kamera: v(-0.05, 1.6, 0.35), hedef: v(-0.2, 1.6, -0.58) }), panel: true },
    { ad: "pencere", grup: pencere, baslik: "Gaziantep", odak: () => ({ kamera: v(-0.75, 1.5, 0.6), hedef: v(-1.05, 1.45, -0.6) }), panel: true },
    { ad: "zarf", grup: zarf, baslik: "İletişim", odak: () => ({ kamera: v(-0.5, 1.35, 0.95), hedef: v(-0.6, 0.76, 0.28) }), panel: true },
    { ad: "defter", grup: defter, baslik: "CV", odak: () => ({ kamera: v(0.54, 1.2, 0.7), hedef: v(0.56, 0.76, 0.28) }), panel: true },
    { ad: "radar", grup: radar, baslik: "Radar · hedef takibi", odak: () => onden(radar, 0.7, 0.13, 0.12), panel: true },
    { ad: "galeri", grup: galeri, baslik: "Ronaldo posterleri", odak: () => galeriOdak(), panel: true },
    { ad: "c2", grup: c2, baslik: "C2 harita ekranı", odak: () => onden(c2, 1.25, 0, -0.08), panel: true },
    { ad: "telemetri", grup: telemetri, baslik: "Gömülü telemetri kartı", odak: () => onden(telemetri, 0.5, 0.03, 0.55), panel: true },
    { ad: "gecit", grup: gecit, baslik: "Taktik mesaj ağ geçidi", odak: () => onden(gecit, 0.7, 0.03, 0.35), panel: true },
    { ad: "fidan", grup: fidan, baslik: "Çınar · dil modeli", odak: () => ({ kamera: v(0.68, 1.12, 0.23), hedef: v(0.84, 0.93, -0.32) }), panel: true },
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
      const p = new THREE.Vector3((sx * e.w) / 2, (sy * e.h) / 2, e.sehim || 0);
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

  // bakış için fare konumu pencerenin tamamından okunur: tuvalin üstündeki yazılar/düğmeler bakışı kesmez
  addEventListener("pointermove", (ev) => {
    if (ev.pointerType !== "touch") fareKonum.set((ev.clientX / innerWidth) * 2 - 1, (ev.clientY / innerHeight) * 2 - 1);
  }, { passive: true });
  renderer.domElement.addEventListener("pointermove", (ev) => {
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
  // ---- Dokunmatik bakınma: parmakla sürükleme ----
  // Sürükleme sahneyi parmakla birlikte kaydırır (sağa sürükle → sola bak). Kısa dokunuş tıklama sayılır.
  // Bırakınca bakış birkaç saniye yerinde kalır, sonra yavaşça ortaya döner.
  const suruk = { x: 0, y: 0, id: null, sx: 0, sy: 0, bx: 0, by: 0, oynadi: false, birakma: 0 };
  const sinirla = (d) => Math.max(-1, Math.min(1, d));
  function dokunmaBakisi() {
    fareKonum.set(suruk.x, suruk.y);
  }
  renderer.domElement.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType !== "touch" || odaktaki || suruk.id !== null) return;
    Object.assign(suruk, { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, bx: suruk.x, by: suruk.y, oynadi: false });
    renderer.domElement.setPointerCapture?.(ev.pointerId);
  });
  renderer.domElement.addEventListener("pointermove", (ev) => {
    if (ev.pointerId !== suruk.id) return;
    const dx = ev.clientX - suruk.sx, dy = ev.clientY - suruk.sy;
    if (!suruk.oynadi && Math.hypot(dx, dy) < 10) return;
    suruk.oynadi = true;
    const olcek = 2.0 / Math.min(innerWidth, innerHeight); // ekran kısa kenarının ~%60ı kadar sürükleme tam dönüş
    suruk.x = sinirla(suruk.bx - dx * olcek);
    suruk.y = sinirla(suruk.by - dy * olcek * 0.6);
    dokunmaBakisi();
  });
  function surukBitti(ev) {
    if (ev.pointerId !== suruk.id) return;
    suruk.id = null;
    suruk.birakma = performance.now();
  }
  renderer.domElement.addEventListener("pointerup", surukBitti);
  renderer.domElement.addEventListener("pointercancel", surukBitti);
  function surukGeriDon() {
    // kare döngüsünden çağrılır: 3 sn dokunulmazsa sürükleme payı yavaşça sıfırlanır
    if (suruk.id !== null || (!suruk.x && !suruk.y) || performance.now() - suruk.birakma < 3000) return;
    suruk.x *= 0.97;
    suruk.y *= 0.97;
    if (Math.abs(suruk.x) + Math.abs(suruk.y) < 0.002) suruk.x = suruk.y = 0;
    dokunmaBakisi();
  }

  renderer.domElement.addEventListener("click", (ev) => {
    if (suruk.oynadi && performance.now() - suruk.birakma < 400) return; // sürüklemenin sonu tıklama sayılmaz
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
    // baş hareketini kullanıcı fareyle kendisi yaptığı için "animasyonları azalt" ayarında da açık kalır
    surukGeriDon();
    fareYumusak.lerp(odaktaki ? new THREE.Vector2() : fareKonum, 0.05);
    // genel görünüşte baş hareketi, insan başı gibi: ortada sakin, kenara gittikçe açılan dönüş.
    // Sola ~63° (yan duvar ve bayrak görünür), sağa ~27° (poster duvarı görünür). Gözler boyun ekseninin önünde olduğundan
    // dönerken bakış noktası boyun etrafında hafifçe yay çizer; baş dönüş yönüne biraz da yatar.
    const fx = fareYumusak.x, fy = fareYumusak.y;
    const k = Math.min(1, Math.abs(fx) / 0.8), kd = k * k * (3 - 2 * k); // ekranın %10'u kenarda tam dönüş
    const yaw = -Math.sign(fx) * kd * (fx < 0 ? 1.1 : 0.48);
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
    if (!azHareket) c2Ciz(dt);
    if (!azHareket) kodCiz(dt);
    panoLedler.forEach((m, i) => { m.emissiveIntensity = azHareket || Math.sin(t * (3 + (i % 5)) + i * 2.3) > -0.4 ? 1.6 : 0.15; });
    oledCiz(t, dt);
    if (!azHareket) bayrakDalga(t);
    bayramSus?.kare(t, dt, azHareket);
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
