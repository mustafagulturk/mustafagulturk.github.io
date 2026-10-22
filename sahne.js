// 3D sahne: hero'da projelerin etrafında döndüğü parlayan bir çekirdek, kaydırdıkça kameranın
// aşağı doğru süzüldüğü yıldız alanı ve sonunda iletişim bölümünü karşılayan bir düğüm.
// WebGL yoksa ya da modül yüklenemezse site eski görünümüyle çalışmaya devam eder.
import * as THREE from "three";

const kok = document.documentElement;
const azHareket = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobil = matchMedia("(max-width: 1000px)").matches;

const PROJELER = [
  { ad: "kadro", baslik: "kadro · işe alım" },
  { ad: "depom", baslik: "depom · stok yönetimi" },
  { ad: "qr", baslik: "qr-siparis" },
];
// Kameranın sayfa boyunca alacağı yol (dünya birimi)
const DERINLIK = 46;

function webglVar() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) {
    return false;
  }
}

function renkler() {
  const s = getComputedStyle(kok);
  const oku = (ad, yedek) => new THREE.Color((s.getPropertyValue(ad) || yedek).trim() || yedek);
  return {
    acik: kok.dataset.theme === "light",
    a1: oku("--accent", "#38bdf8"),
    a2: oku("--accent-2", "#a855f7"),
    a3: oku("--accent-3", "#22d3ee"),
  };
}

// Ashima Arts 3D simplex gürültüsü (MIT)
const GURULTU = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/** Gürültüyle dalgalanan, kenarları degrade parlayan küre. */
function cekirdek(r) {
  const malzeme = new THREE.ShaderMaterial({
    uniforms: { uZaman: { value: 0 }, uA1: { value: r.a1 }, uA2: { value: r.a2 }, uA3: { value: r.a3 }, uGuc: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uZaman; uniform float uGuc;
      varying vec3 vNormal; varying vec3 vGoz; varying float vDalga;
      ${GURULTU}
      void main() {
        float d = snoise(normal * 1.4 + uZaman * 0.35) * 0.22 * uGuc + snoise(normal * 3.2 - uZaman * 0.2) * 0.06;
        vDalga = d;
        vec3 p = position + normal * d;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vGoz = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA1; uniform vec3 uA2; uniform vec3 uA3; uniform float uZaman;
      varying vec3 vNormal; varying vec3 vGoz; varying float vDalga;
      void main() {
        float fresnel = pow(1.0 - max(dot(vNormal, vGoz), 0.0), 2.2);
        float t = vNormal.y * 0.5 + 0.5 + vDalga * 1.5;
        vec3 renk = mix(uA2, uA1, smoothstep(0.15, 0.85, t));
        renk = mix(renk, uA3, smoothstep(0.55, 1.0, vNormal.x * 0.5 + 0.5) * 0.45);
        renk *= 0.55 + 0.45 * smoothstep(-0.1, 0.25, vDalga);
        renk += fresnel * mix(uA1, vec3(1.0), 0.35) * 1.1;
        gl_FragColor = vec4(renk, 1.0);
      }`,
  });
  return new THREE.Mesh(new THREE.IcosahedronGeometry(1, mobil ? 32 : 64), malzeme);
}

/** Yumuşak, yuvarlak ve titreşen noktalardan oluşan yıldız alanı. */
function yildizlar(r, adet) {
  const konum = new Float32Array(adet * 3);
  const tohum = new Float32Array(adet);
  for (let i = 0; i < adet; i++) {
    konum[i * 3] = (Math.random() - 0.5) * 44;
    konum[i * 3 + 1] = 10 - Math.random() * (DERINLIK + 20);
    konum[i * 3 + 2] = -Math.random() * 30 + 4;
    tohum[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(konum, 3));
  g.setAttribute("aTohum", new THREE.BufferAttribute(tohum, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uZaman: { value: 0 }, uA1: { value: r.a1 }, uA2: { value: r.a2 }, uOran: { value: Math.min(devicePixelRatio, 2) }, uAcik: { value: r.acik ? 1 : 0 } },
    vertexShader: /* glsl */ `
      uniform float uZaman; uniform float uOran;
      attribute float aTohum; varying float vTohum; varying float vIsik;
      void main() {
        vec3 p = position;
        p.x += sin(uZaman * 0.15 + aTohum * 40.0) * 0.3;
        p.y += cos(uZaman * 0.12 + aTohum * 30.0) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vTohum = aTohum;
        vIsik = 0.55 + 0.45 * sin(uZaman * (0.8 + aTohum * 1.6) + aTohum * 60.0);
        gl_PointSize = (2.0 + aTohum * 4.5) * uOran * (9.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA1; uniform vec3 uA2; uniform float uAcik;
      varying float vTohum; varying float vIsik;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        vec3 renk = mix(uA1, uA2, vTohum);
        gl_FragColor = vec4(renk, a * vIsik * mix(0.9, 0.55, uAcik));
      }`,
  });
  return new THREE.Points(g, m);
}

/** Proje görselini pencere çubuğuyla birlikte yuvarlak köşeli bir dokuya çizer. */
function pencereDokusu(src, baslik) {
  const G = 1024, Y = 700, BAR = 52, R = 28;
  const c = document.createElement("canvas");
  c.width = G;
  c.height = Y;
  const x = c.getContext("2d");
  const doku = new THREE.CanvasTexture(c);
  doku.colorSpace = THREE.SRGBColorSpace;
  doku.anisotropy = 4;
  const ciz = (img) => {
    x.clearRect(0, 0, G, Y);
    x.save();
    x.beginPath();
    x.roundRect(0, 0, G, Y, R);
    x.clip();
    x.fillStyle = "#0f172a";
    x.fillRect(0, 0, G, Y);
    if (img) {
      const oran = G / img.width;
      x.drawImage(img, 0, BAR, G, Math.max(Y - BAR, img.height * oran));
    }
    x.fillStyle = "#1e293b";
    x.fillRect(0, 0, G, BAR);
    ["#f87171", "#fbbf24", "#34d399"].forEach((r, i) => {
      x.fillStyle = r;
      x.beginPath();
      x.arc(30 + i * 26, BAR / 2, 8, 0, Math.PI * 2);
      x.fill();
    });
    x.fillStyle = "#94a3b8";
    x.font = "500 22px 'JetBrains Mono', monospace";
    x.fillText(baslik, 118, BAR / 2 + 8);
    x.restore();
    x.strokeStyle = "rgba(255,255,255,.14)";
    x.lineWidth = 3;
    x.beginPath();
    x.roundRect(1.5, 1.5, G - 3, Y - 3, R);
    x.stroke();
    doku.needsUpdate = true;
  };
  ciz(null);
  const img = new Image();
  img.onload = () => ciz(img);
  img.src = src;
  return doku;
}

/** Ekranın arkasındaki yumuşak ışık halesi. */
function haleDokusu() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,.9)");
  g.addColorStop(0.35, "rgba(255,255,255,.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function baslat() {
  const tuval = document.createElement("canvas");
  tuval.id = "sahne";
  tuval.setAttribute("aria-hidden", "true");
  document.body.prepend(tuval);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: tuval, antialias: !mobil, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    tuval.remove();
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobil ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);

  let r = renkler();
  const sahne = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 120);
  kamera.position.set(0, 0, 9);

  // Hero: çekirdek + etrafında dönen proje ekranları
  const hero = new THREE.Group();
  sahne.add(hero);
  const kure = cekirdek(r);
  hero.add(kure);

  const kafes = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.75, 1)),
    new THREE.LineBasicMaterial({ color: r.a1, transparent: true, opacity: 0.35 })
  );
  hero.add(kafes);

  const halka = new THREE.Mesh(
    new THREE.TorusGeometry(2.25, 0.012, 8, 160),
    new THREE.MeshBasicMaterial({ color: r.a2, transparent: true, opacity: 0.6 })
  );
  halka.rotation.x = Math.PI / 2.3;
  hero.add(halka);

  const carousel = new THREE.Group();
  hero.add(carousel);
  const hale = haleDokusu();
  const ekranlar = PROJELER.map((p, i) => {
    const grup = new THREE.Group();
    const aci = (i / PROJELER.length) * Math.PI * 2;
    grup.userData = { proje: p.ad, aci, olcek: 1 };
    const G = 2.3, Y = G * (700 / 1024);
    const on = new THREE.Mesh(
      new THREE.PlaneGeometry(G, Y),
      new THREE.MeshBasicMaterial({ map: pencereDokusu(`assets/${p.ad}/poster.webp`, p.baslik), transparent: true })
    );
    const arka = new THREE.Mesh(
      new THREE.PlaneGeometry(G * 0.98, Y * 0.98),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.85 })
    );
    arka.rotation.y = Math.PI;
    const isik = new THREE.Sprite(new THREE.SpriteMaterial({ map: hale, color: i % 2 ? r.a2 : r.a1, transparent: true, opacity: 0.35, depthWrite: false }));
    isik.scale.set(G * 1.9, Y * 2.2, 1);
    isik.position.z = -0.05;
    grup.add(isik, arka, on);
    grup.userData.on = on;
    grup.userData.arka = arka;
    grup.userData.isik = isik;
    carousel.add(grup);
    return grup;
  });

  const yildiz = yildizlar(r, mobil ? 1100 : 2600);
  sahne.add(yildiz);

  // Yol boyunca yavaşça dönen tel kafes şekiller
  const sekiller = new THREE.Group();
  sahne.add(sekiller);
  const geometriler = [
    new THREE.OctahedronGeometry(0.7),
    new THREE.TorusGeometry(0.6, 0.2, 10, 28),
    new THREE.IcosahedronGeometry(0.75, 0),
    new THREE.TetrahedronGeometry(0.8),
    new THREE.TorusKnotGeometry(0.45, 0.13, 64, 8),
  ];
  for (let i = 0; i < (mobil ? 9 : 16); i++) {
    const m = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometriler[i % geometriler.length], 20),
      new THREE.LineBasicMaterial({ color: i % 2 ? r.a1 : r.a2, transparent: true, opacity: 0.5 })
    );
    const sag = i % 2 ? 1 : -1;
    m.position.set(sag * (4.5 + Math.random() * 3.5), -6 - (i / 16) * (DERINLIK - 10) - Math.random() * 2, -2 - Math.random() * 7);
    m.userData.hiz = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.4);
    m.scale.setScalar(0.7 + Math.random() * 0.9);
    sekiller.add(m);
  }

  // Sayfanın sonunda iletişim bölümünü karşılayan düğüm
  const dugum = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.4, 0.38, mobil ? 160 : 260, mobil ? 16 : 28),
    kure.material.clone()
  );
  dugum.material.uniforms.uGuc.value = 0.35;
  dugum.position.set(mobil ? 1.6 : 6.2, -DERINLIK + 0.4, -6);
  dugum.scale.setScalar(mobil ? 0.6 : 0.8);
  sahne.add(dugum);

  function temaUygula() {
    r = renkler();
    for (const mat of [kure.material, dugum.material]) {
      mat.uniforms.uA1.value = r.a1;
      mat.uniforms.uA2.value = r.a2;
      mat.uniforms.uA3.value = r.a3;
    }
    yildiz.material.uniforms.uA1.value = r.a1;
    yildiz.material.uniforms.uA2.value = r.a2;
    yildiz.material.uniforms.uAcik.value = r.acik ? 1 : 0;
    const harman = r.acik ? THREE.NormalBlending : THREE.AdditiveBlending;
    yildiz.material.blending = harman;
    kafes.material.color.copy(r.a1);
    halka.material.color.copy(r.a2);
    sekiller.children.forEach((m, i) => {
      m.material.color.copy(i % 2 ? r.a1 : r.a2);
      m.material.opacity = r.acik ? 0.45 : 0.5;
    });
    ekranlar.forEach((e, i) => {
      e.userData.isik.material.color.copy(i % 2 ? r.a2 : r.a1);
      e.userData.isik.material.opacity = r.acik ? 0.22 : 0.35;
      e.userData.arka.material.color.set(r.acik ? 0xe0e7ff : 0x0f172a);
      e.userData.arka.material.opacity = r.acik ? 0.55 : 0.85;
    });
    [yildiz.material, kafes.material, halka.material].forEach((m) => (m.needsUpdate = true));
  }
  temaUygula();
  new MutationObserver(temaUygula).observe(kok, { attributes: true, attributeFilter: ["data-theme"] });

  // Yerleşim: masaüstünde sağda, mobilde başlığın üstünde küçük
  function yerlestir() {
    const g = innerWidth, y = innerHeight;
    renderer.setSize(g, y, false);
    kamera.aspect = g / y;
    kamera.updateProjectionMatrix();
    const yarimGenislik = Math.tan(THREE.MathUtils.degToRad(kamera.fov / 2)) * kamera.position.z * kamera.aspect;
    if (g > 1000) {
      hero.position.set(Math.min(yarimGenislik * 0.52, 4.2), 0.1, 0);
      hero.scale.setScalar(Math.min(1, yarimGenislik / 6.2));
    } else {
      // Mobilde başlığın sağ üstünde, kısmen ekran dışında
      const yarimYukseklik = Math.tan(THREE.MathUtils.degToRad(kamera.fov / 2)) * (kamera.position.z + 4);
      hero.position.set(yarimGenislik * 1.25, yarimYukseklik * 0.62, -4);
      hero.scale.setScalar(0.72);
    }
  }
  yerlestir();
  addEventListener("resize", yerlestir);

  // Fare ve kaydırma
  const fare = new THREE.Vector2(0, 0);
  const hedefFare = new THREE.Vector2(0, 0);
  const ndc = new THREE.Vector2(-10, -10);
  addEventListener("pointermove", (e) => {
    hedefFare.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  }, { passive: true });
  const ilerleme = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    return h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
  };
  let kaydir = ilerleme();

  // Ekrana tıklayınca o projenin önizlemesi açılır
  const isin = new THREE.Raycaster();
  let uzerinde = null;
  const onYuzler = ekranlar.map((e) => e.userData.on);
  function isinGonder() {
    isin.setFromCamera(ndc, kamera);
    const vurus = isin.intersectObjects(onYuzler, false)[0];
    const yeni = vurus ? vurus.object.parent : null;
    if (yeni !== uzerinde) {
      uzerinde = yeni;
      kok.classList.toggle("sahne-isaret", !!uzerinde);
    }
  }
  addEventListener("click", (e) => {
    if (!uzerinde || e.target.closest("a, button, input, dialog, nav, header")) return;
    document.querySelector(`[data-proje="${uzerinde.userData.proje}"][data-onizle="video"]`)?.click();
  });

  const saat = new THREE.Clock();
  let onceki = 0;
  let calisiyor = true;
  document.addEventListener("visibilitychange", () => {
    calisiyor = !document.hidden;
    if (calisiyor && !azHareket) requestAnimationFrame(kare);
  });

  function kare() {
    if (!calisiyor) return;
    const t = azHareket ? 4 : saat.getElapsedTime();
    const dt = Math.min(t - onceki, 0.05);
    onceki = t;
    kaydir += (ilerleme() - kaydir) * (azHareket ? 1 : 0.075);
    fare.lerp(hedefFare, 0.05);

    kamera.position.x = fare.x * 0.9;
    kamera.position.y = -kaydir * DERINLIK - fare.y * 0.6;
    kamera.lookAt(0, -kaydir * DERINLIK, 0);
    kamera.rotation.z = fare.x * -0.03;

    kure.material.uniforms.uZaman.value = t;
    dugum.material.uniforms.uZaman.value = t * 0.8;
    yildiz.material.uniforms.uZaman.value = t;

    kure.rotation.y = t * 0.15;
    kafes.rotation.set(t * 0.08, -t * 0.12, 0);
    halka.rotation.z = t * 0.2;
    carousel.rotation.y = t * 0.18 + kaydir * 5;
    carousel.rotation.x = -0.12 + fare.y * 0.15;
    ekranlar.forEach((e) => {
      const { aci } = e.userData;
      e.position.set(Math.sin(aci) * 2.75, Math.sin(t * 0.9 + aci * 2) * 0.18, Math.cos(aci) * 2.75);
      e.rotation.y = aci;
      const hedef = e === uzerinde ? 1.12 : 1;
      e.userData.olcek += (hedef - e.userData.olcek) * 0.12;
      e.scale.setScalar(e.userData.olcek);
    });
    hero.rotation.y = fare.x * 0.25;

    sekiller.children.forEach((m) => {
      m.rotation.x += m.userData.hiz.x * dt;
      m.rotation.y += m.userData.hiz.y * dt;
    });
    dugum.rotation.set(t * 0.12, t * 0.18, 0);

    if (!mobil) isinGonder();
    renderer.render(sahne, kamera);
    if (!kok.classList.contains("uc-boyut")) kok.classList.add("uc-boyut");
    if (!azHareket) requestAnimationFrame(kare);
  }

  if (azHareket) {
    // Hareket istemeyenlere tek kare çizilir, kaydırınca kamera yeniden konumlanır
    kare();
    addEventListener("scroll", () => requestAnimationFrame(kare), { passive: true });
    new MutationObserver(() => requestAnimationFrame(kare)).observe(kok, { attributes: true, attributeFilter: ["data-theme"] });
  } else {
    requestAnimationFrame(kare);
  }
}

if (webglVar()) baslat();
