const kok = document.documentElement;
const $ = (s) => document.querySelector(s);

const azHareket = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Tema değiştirme: butondan başlayıp tüm ekranı kaplayan dairesel geçiş
const temaBtn = $("#tema");
function temayiDegistir() {
  const yeni = kok.dataset.theme === "light" ? "dark" : "light";
  kok.dataset.theme = yeni;
  try { localStorage.setItem("tema", yeni); } catch (e) {}
}
temaBtn.addEventListener("click", async () => {
  if (!document.startViewTransition || azHareket) return temayiDegistir();

  const r = temaBtn.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const yaricap = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  kok.classList.add("tema-gecis");
  const gecis = document.startViewTransition(temayiDegistir);
  await gecis.ready;
  kok.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${yaricap}px at ${x}px ${y}px)`] },
    { duration: 650, easing: "cubic-bezier(.65, 0, .35, 1)", pseudoElement: "::view-transition-new(root)" }
  );
  await gecis.finished;
  kok.classList.remove("tema-gecis");
});

// Mobil menü
const menu = $("#menu");
const menuBtn = $("#menu-btn");
menuBtn.addEventListener("click", () => {
  const acik = menu.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", acik);
  menuBtn.textContent = acik ? "✕" : "☰";
});
menu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    menu.classList.remove("open");
    menuBtn.textContent = "☰";
  })
);

$("#yil").textContent = new Date().getFullYear();

// Dil (TR/EN)
let dil = "tr";
try { if (localStorage.getItem("dil") === "en") dil = "en"; } catch (e) {}
const ceviriler = document.querySelectorAll("[data-i18n]");
ceviriler.forEach((el) => (el.dataset.tr = el.textContent.trim()));

function diliUygula() {
  kok.lang = dil;
  ceviriler.forEach((el) => {
    el.textContent = dil === "en" ? CEVIRI_EN[el.dataset.i18n] ?? el.dataset.tr : el.dataset.tr;
  });
  $("#dil").textContent = dil === "tr" ? "EN" : "TR";
  if (repoVerisi) repolariCiz();
}
$("#dil").addEventListener("click", () => {
  dil = dil === "tr" ? "en" : "tr";
  try { localStorage.setItem("dil", dil); } catch (e) {}
  ui = 0;
  ci = 0;
  siliniyor = false;
  diliUygula();
});

// Daktilo efekti
const yazi = $("#yazi");
let ui = 0, ci = yazi.textContent.length, siliniyor = true;
function daktilo() {
  const unvanlar = METIN[dil].unvanlar;
  const kelime = unvanlar[ui];
  ci += siliniyor ? -1 : 1;
  yazi.textContent = kelime.slice(0, ci);
  let bekle = siliniyor ? 50 : 90;
  if (!siliniyor && ci === kelime.length) {
    siliniyor = true;
    bekle = 1800;
  } else if (siliniyor && ci === 0) {
    siliniyor = false;
    ui = (ui + 1) % unvanlar.length;
    bekle = 300;
  }
  setTimeout(daktilo, bekle);
}
if (!azHareket) setTimeout(daktilo, 2000);

// Kaydırma: ilerleme çubuğu, yukarı butonu, aktif menü bağlantısı
const ilerleme = $("#ilerleme");
const yukari = $("#yukari");
const bolumler = [...document.querySelectorAll("main section[id]")];
const nav = $(".nav");
let sonY = scrollY;
function kaydirma() {
  // Aşağı kaydırırken menüyü gizle, yukarı kaydırınca göster
  if (!menu.classList.contains("open")) nav.classList.toggle("gizli", scrollY > 300 && scrollY > sonY);
  sonY = scrollY;

  const max = document.body.scrollHeight - innerHeight;
  ilerleme.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
  yukari.classList.toggle("show", scrollY > 600);

  const aktif = bolumler.filter((b) => b.offsetTop - 120 <= scrollY).pop();
  menu.querySelectorAll("a").forEach((a) =>
    a.classList.toggle("active", aktif && a.getAttribute("href") === `#${aktif.id}`)
  );
}
addEventListener("scroll", kaydirma, { passive: true });
yukari.addEventListener("click", () => scrollTo({ top: 0 }));

// Bölümleri ekrana girince yumuşakça göster
const gozlemci = new IntersectionObserver((girdiler) => {
  girdiler.forEach((g) => {
    if (g.isIntersecting) {
      g.target.classList.add("visible");
      gozlemci.unobserve(g.target);
    }
  });
}, { threshold: 0.1 });
bolumler.forEach((s) => {
  s.classList.add("reveal");
  gozlemci.observe(s);
});

const siraVer = () =>
  document.querySelectorAll(".stagger").forEach((k) => [...k.children].forEach((c, i) => c.style.setProperty("--i", i)));
siraVer();

// E-postayı kopyala
const bildirim = $("#bildirim");
function goster(mesaj) {
  bildirim.textContent = mesaj;
  bildirim.classList.add("show");
  setTimeout(() => bildirim.classList.remove("show"), 2000);
}
$("#kopyala").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText("mustafagulturk153@gmail.com");
    goster(METIN[dil].kopyalandi);
  } catch (e) {
    goster("mustafagulturk153@gmail.com");
  }
});

// GitHub API'den herkese açık repoları çek
const RENKLER = { JavaScript: "#f1e05a", HTML: "#e34c26", CSS: "#563d7c", Python: "#3572A5", Java: "#b07219", "C#": "#178600", Dart: "#00B4AB", TypeScript: "#3178c6", C: "#555555", "C++": "#f34b7d", Go: "#00ADD8" };
const kacis = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

let repoVerisi = null;

// GitHub'da açıklaması boş olan repolar için yedek açıklamalar
const ACIKLAMALAR = {
  "radar-target-tracker": { tr: "Radar Target Tracker: Kalman filtresiyle çoklu hedef takibi ve Qt radar ekranı. C++17, Qt, UDP.", en: "Radar Target Tracker: multi-target Kalman tracking with a Qt radar display. C++17, Qt, UDP." },
  "c2-map-display": { tr: "C2 Harita Ekranı: UDP radar verisini Kalman ile izleyen, çevrimdışı haritalı komuta kontrol ekranı. Java 21, JavaFX.", en: "C2 Map Display: a command-and-control display tracking UDP radar data with a Kalman filter on an offline map. Java 21, JavaFX." },
  "taktik-mesaj-gecidi": { tr: "Taktik Mesaj Ağ Geçidi: bit düzeyinde ikili protokol, TCP, fuzz testli kodek. Go.", en: "Tactical Message Gateway: bit-level binary protocol over TCP with a fuzz-tested codec. Go." },
  "embedded-telemetry": { tr: "Gömülü telemetri: STM32F446RE için FreeRTOS firmware'i ve Python yer istasyonu. C, Renode.", en: "Embedded telemetry: FreeRTOS firmware for STM32F446RE and a Python ground station. C, Renode." },
  "ise-alim": { tr: "Kadro: Claude ile CV puanlayan yapay zekâ destekli işe alım platformu. NestJS, Next.js, PostgreSQL.", en: "Kadro: AI-powered applicant tracking that scores CVs with Claude. NestJS, Next.js, PostgreSQL." },
  ocakbasi: { tr: "Ocakbaşı: Antep mutfağı temalı mobil restoran oyunu. Phaser, Capacitor, Fastify.", en: "Ocakbaşı: a Gaziantep-cuisine mobile restaurant game. Phaser, Capacitor, Fastify." },
  "mobil-okey": { tr: "Okey Salonu: Android için gerçek zamanlı 4 kişilik online Okey. React, Capacitor, Node.js, WebSocket.", en: "Okey Salonu: real-time 4-player online Okey for Android. React, Capacitor, Node.js, WebSocket." },
  "stok-yonetimi": { tr: "Depom: çok depolu stok ve satın alma yönetimi. ASP.NET Core, PostgreSQL, React.", en: "Depom: multi-warehouse stock and purchasing management. ASP.NET Core, PostgreSQL, React." },
  "qr-siparis": { tr: "Restoranlar için QR menü ve canlı mutfak paneli. Next.js, PostgreSQL.", en: "QR menu and live kitchen board for restaurants. Next.js, PostgreSQL." },
  "mustafagulturk.github.io": { tr: "Şu an baktığın portfolyo sitesi.", en: "The portfolio site you're looking at." },
  "Gazianteptanitim": { tr: "Gaziantep'i tanıtan ilk web projem.", en: "My first web project, introducing Gaziantep." },
  "berber-uygulama": { tr: "Berber dükkanları için randevu uygulaması.", en: "Appointment app for barber shops." },
};

function repolariCiz() {
  const kutu = $("#repolar");
  const m = METIN[dil];
  if (!repoVerisi.length) {
    kutu.innerHTML = `<p class="section-sub">${m.repoYok}</p>`;
    return;
  }
  kutu.innerHTML = repoVerisi.slice(0, 6).map((r) => `
    <a class="repo spot" href="${kacis(r.html_url)}" target="_blank" rel="noopener">
      <h4>${kacis(r.name)}</h4>
      <p>${kacis(r.description || (ACIKLAMALAR[r.name] ?? {})[dil] || m.aciklamaYok)}</p>
      <div class="repo-meta">
        ${r.language ? `<span><i class="lang-dot" style="background:${RENKLER[r.language] || "var(--accent)"}"></i>${kacis(r.language)}</span>` : ""}
        <span>★ ${r.stargazers_count}</span>
        <span>${new Date(r.pushed_at).toLocaleDateString(m.tarih, { month: "short", year: "numeric" })}</span>
      </div>
    </a>`).join("");
  siraVer();
}

// Tüm repolardaki dil kullanımını (byte olarak) toplayıp çubuk grafik çizer
async function dilleriYukle(repolar) {
  const toplam = {};
  const sonuclar = await Promise.all(
    repolar.map((r) => fetch(r.languages_url).then((x) => (x.ok ? x.json() : {})).catch(() => ({})))
  );
  sonuclar.forEach((d) => Object.entries(d).forEach(([ad, byte]) => (toplam[ad] = (toplam[ad] || 0) + byte)));
  const hepsi = Object.values(toplam).reduce((a, b) => a + b, 0);
  if (!hepsi) {
    $(".lang-stats").hidden = true;
    return;
  }
  const sirali = Object.entries(toplam).sort((a, b) => b[1] - a[1]).slice(0, 6);
  $("#dil-bar").innerHTML = sirali
    .map(([ad, byte]) => `<span style="width:${(byte / hepsi) * 100}%;background:${RENKLER[ad] || "var(--accent)"}" title="${kacis(ad)}"></span>`)
    .join("");
  $("#dil-liste").innerHTML = sirali
    .map(([ad, byte]) => `<li><i class="lang-dot" style="background:${RENKLER[ad] || "var(--accent)"}"></i>${kacis(ad)} <b>${((byte / hepsi) * 100).toFixed(1)}%</b></li>`)
    .join("");
}

async function repolariYukle() {
  try {
    const res = await fetch("https://api.github.com/users/mustafagulturk/repos?sort=updated&per_page=30");
    if (!res.ok) throw new Error(res.status);
    repoVerisi = (await res.json()).filter((r) => !r.fork);
    sayac($("#stat-repo"), repoVerisi.length);
    repolariCiz();
    dilleriYukle(repoVerisi);
  } catch (e) {
    $("#stat-repo").textContent = "3+";
    $(".lang-stats").hidden = true;
    $("#repolar").innerHTML = `<p class="section-sub">${METIN[dil].repoHata}</p>`;
  }
}

// Kartlarda fareyi takip eden ışık efekti
document.addEventListener("pointermove", (e) => {
  const kart = e.target.closest?.(".spot");
  if (!kart) return;
  const r = kart.getBoundingClientRect();
  kart.style.setProperty("--mx", `${e.clientX - r.left}px`);
  kart.style.setProperty("--my", `${e.clientY - r.top}px`);
});

// Sayıyı 0'dan hedefe doğru sayarak gösterir
function sayac(el, hedef) {
  if (azHareket) return (el.textContent = hedef);
  const bas = performance.now();
  const adim = (t) => {
    const k = Math.min((t - bas) / 1000, 1);
    el.textContent = Math.round(hedef * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(adim);
  };
  requestAnimationFrame(adim);
}

// Proje kartlarında fareye göre 3D eğim
document.querySelectorAll(".tilt").forEach((kart) => {
  kart.addEventListener("pointermove", (e) => {
    const r = kart.getBoundingClientRect();
    kart.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
    kart.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -10}deg`);
  });
  kart.addEventListener("pointerleave", () => {
    kart.style.removeProperty("--rx");
    kart.style.removeProperty("--ry");
  });
});

// Hero arka planında birbirine bağlanan parçacıklar
function parcaciklar() {
  const tuval = $("#parcacik");
  const ctx = tuval.getContext("2d");
  const fare = { x: -999, y: -999 };
  let noktalar = [];
  let gorunur = true;

  function boyutla() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    tuval.width = tuval.offsetWidth * dpr;
    tuval.height = tuval.offsetHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const adet = Math.min(70, Math.floor((tuval.offsetWidth * tuval.offsetHeight) / 14000));
    noktalar = Array.from({ length: adet }, () => ({
      x: Math.random() * tuval.offsetWidth,
      y: Math.random() * tuval.offsetHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));
  }

  function ciz() {
    // 3D oda açıksa sayfa gizlidir, 3D yörünge açıksa bu katman gizlenir, boşuna çizmeyelim
    if (!gorunur || kok.classList.contains("oda-modu") || kok.classList.contains("uc-boyut")) return;
    const w = tuval.offsetWidth, h = tuval.offsetHeight;
    const renk = getComputedStyle(kok).getPropertyValue("--accent").trim();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = ctx.strokeStyle = renk;
    for (const n of noktalar) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    const hepsi = [...noktalar, fare];
    for (let i = 0; i < hepsi.length; i++) {
      for (let j = i + 1; j < hepsi.length; j++) {
        const d = Math.hypot(hepsi[i].x - hepsi[j].x, hepsi[i].y - hepsi[j].y);
        if (d < 120) {
          ctx.globalAlpha = (1 - d / 120) * 0.25;
          ctx.beginPath(); ctx.moveTo(hepsi[i].x, hepsi[i].y); ctx.lineTo(hepsi[j].x, hepsi[j].y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(ciz);
  }

  tuval.parentElement.addEventListener("pointermove", (e) => {
    const r = tuval.getBoundingClientRect();
    fare.x = e.clientX - r.left;
    fare.y = e.clientY - r.top;
  });
  tuval.parentElement.addEventListener("pointerleave", () => (fare.x = fare.y = -999));
  addEventListener("resize", boyutla);
  // Hero ekrandan çıkınca animasyonu durdur
  new IntersectionObserver(([g]) => {
    const once = gorunur;
    gorunur = g.isIntersecting;
    if (gorunur && !once) requestAnimationFrame(ciz);
  }).observe(tuval);

  boyutla();
  requestAnimationFrame(ciz);
}
if (!azHareket) parcaciklar();

diliUygula();
repolariYukle();
kaydirma();

// Öne çıkan proje: görünürken videoyu oynat, tıklayınca önizleme penceresini aç
const PROJELER = {
  radar: { ad: "Radar Target Tracker", ekranlar: [
  ["poster", "Qt PPI ekranı: dönen tarama, izler ve iz tablosu", "Qt PPI display: rotating scan, tracks and track table"],
  ] },
  c2: { ad: "C2 Harita Ekranı", ekranlar: [
  ["poster", "Operatör ekranı: izler, yasak bölge alarmı, bilgi paneli ve olay listesi", "Operator display: tracks, restricted-zone alarm, info panel and event log"],
  ] },
  telemetri: { ad: "Gömülü Telemetri", ekranlar: [
  ["poster", "Renode'da yer istasyonu: irtifa, IMU ve mod", "Ground station on Renode: altitude, IMU and mode"],
  ] },
  qr: { ad: "QR Sipariş", ekranlar: [
  ["musteri-menu", "Müşteri menüsü: kategoriler, arama ve etiketler", "Customer menu: categories, search and tags"],
  ["sepet", "Sepet ve sipariş notu", "Cart and order note"],
  ["siparis-takip", "Canlı sipariş takibi", "Live order tracking"],
  ["degerlendirme", "Teslimden sonra değerlendirme", "Review after delivery"],
  ["mutfak-cagri", "Mutfak paneli ve garson / hesap çağrıları", "Kitchen board with waiter and bill requests"],
  ["yonetim", "Yönetim paneli: ciro, haftalık grafik, çok satanlar", "Admin dashboard: revenue, weekly chart, best sellers"],
  ["masalar", "Masalar ve QR kodları", "Tables and QR codes"],
  ["menu-yonetimi", "Menü yönetimi", "Menu management"],
  ] },
  kadro: { ad: "Kadro", ekranlar: [
  ["kanban", "Aday hattı: kanban, puan ve beceri filtresi", "Pipeline: kanban with score and skill filters"],
  ["aday-analizi", "Gereksinim bazında CV analizi ve kanıt cümleleri", "Requirement-by-requirement CV analysis with evidence"],
  ["mulakat-kiti", "Adaya özel mülakat kiti", "Interview kit tailored to the candidate"],
  ["kitli-degerlendirme", "Soru bazında mülakat değerlendirmesi", "Per-question interview scorecard"],
  ["saat-onerileri", "Mülakatçıların ortak boş saatleri", "Interviewers' shared free slots"],
  ["aday-saat-secimi", "Adayın mülakat saatini kendisi seçmesi", "Candidate picking their own interview slot"],
  ["yetenek-havuzu", "Yetenek havuzu: eski adaylardan yeni ilana öneri", "Talent pool: past applicants suggested for a new job"],
  ["karsilastirma", "Adayları yan yana karşılaştırma", "Side-by-side candidate comparison"],
  ["cv-arama", "CV içinde Türkçe tam metin arama", "Full-text CV search with Turkish stemming"],
  ["analitik", "Dönüşüm hunisi ve işe alım süreleri", "Conversion funnel and time to hire"],
  ["kariyer-ilani", "Şirketin kariyer sayfası", "Company careers page"],
  ["karanlik-mod", "Koyu tema", "Dark theme"],
  ] },
  ocakbasi: { ad: "Ocakbaşı", ekranlar: [
  ["mutfak", "Mutfak: ızgara, taş fırın, ocak ve tezgâh", "Kitchen: grill, stone oven, stove and counter"],
  ["kayit", "İlk açılışta oyuncu adı ve dükkân adı", "Player and shop name on first launch"],
  ["menu", "Ana menü ve oyuncunun dükkân tabelası", "Main menu with the player's shop sign"],
  ["gun-sonu", "Gün sonu özeti ve dükkânı büyütme", "End-of-day summary and shop upgrades"],
  ["skor-tablosu", "Sunucuda doğrulanan skor tablosu", "Server-verified leaderboard"],
  ["oyun-sonu", "Oyun sonu ve rekor", "Game over and new record"],
  ] },
  okey: { ad: "Okey Salonu", ekranlar: [
  ["masa", "Masa: bordo çuha, ceviz istaka ve bakalit taşlar", "Table: burgundy baize, walnut rack and Bakelite tiles"],
  ["lobi", "Lobi: salonlar, çip aralıkları, günlük hediye ve görevler", "Lobby: lounges, chip ranges, daily gift and quests"],
  ["surukleyerek-cekme", "Desteden sürükleyerek taş çekme", "Dragging a tile from the deck"],
  ["bitirme", "Son taşı göstergeye bırakarak eli bitirme", "Finishing the hand by dropping the last tile on the indicator"],
  ["sonuc", "Sunucunun doğruladığı el sonu ve kutlama", "Server-validated hand result and celebration"],
  ["hatali-bitir", "Bitmemiş el iddiası reddedilir, taş geri döner", "An invalid finish claim is rejected and the tile returns"],
  ["magaza", "Mağaza: Play Billing ile çip paketleri", "Shop: chip packs with Play Billing"],
  ["profil", "Profil ve isim etiketi süsleri", "Profile and name-tag cosmetics"],
  ] },
  depom: { ad: "Depom", ekranlar: [
  ["panel", "Panel: stok değeri, hareket grafiği, kritik stok", "Dashboard: stock value, movement chart, critical stock"],
  ["bildirimler", "Başka bir personelin işlemi canlı akışta", "Another staff member's action in the live feed"],
  ["komut-paleti", "Ctrl+K komut paleti ile ürün ve işlem arama", "Ctrl+K command palette for products and actions"],
  ["sayim-fark", "Barkodla toplu sayım ve fark tutarı", "Barcode stock count with value of differences"],
  ["otomatik-siparis", "Kritik stoktan tedarikçi başına taslak sipariş", "Draft orders per supplier from critical stock"],
  ["mal-kabul", "Kısmi mal kabul", "Partial goods receipt"],
  ["ice-aktar", "CSV ile toplu ürün içe aktarma ve önizleme", "Bulk product import from CSV with preview"],
  ["etiketler", "EAN-13 barkodlu raf etiketleri", "Shelf labels with EAN-13 barcodes"],
  ["panel-koyu", "Koyu tema", "Dark theme"],
  ] },
};
const onizleme = $("#onizleme");
const onizlemeVideo = $("#onizleme-video");
let proje = "qr";
let EKRANLAR = PROJELER.qr.ekranlar;
let galeriSira = 0;

if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  document.querySelectorAll(".featured-media").forEach((kartMedya) => {
    const kartVideo = kartMedya.querySelector("video");
    new IntersectionObserver(([g]) => {
      if (g.isIntersecting) kartVideo.play().then(() => kartMedya.classList.add("oynuyor")).catch(() => {});
      else kartVideo.pause();
    }, { threshold: 0.4 }).observe(kartMedya);
  });
}

const noktalar = $("#galeri-noktalar");

/** Önizleme penceresini seçilen projenin video ve ekranlarıyla doldurur. */
function projeSec(ad) {
  if (ad === proje && noktalar.childElementCount) return;
  proje = ad;
  EKRANLAR = PROJELER[ad].ekranlar;
  galeriSira = 0;
  $("#onizleme-baslik").textContent = PROJELER[ad].ad;
  onizleme.querySelectorAll("[data-cap]").forEach((p) => (p.hidden = p.dataset.cap !== ad));
  onizlemeVideo.poster = `assets/${ad}/poster.webp`;
  onizlemeVideo.innerHTML = `<source src="assets/${ad}/demo.mp4" type="video/mp4"><source src="assets/${ad}/demo.webm" type="video/webm">`;
  onizlemeVideo.load();
  noktalar.replaceChildren(...EKRANLAR.map(([dosya], i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<img src="assets/${ad}/${dosya}.webp" alt="" loading="lazy">`;
    b.addEventListener("click", () => galeriGoster(i));
    return b;
  }));
}

function galeriGoster(i) {
  galeriSira = (i + EKRANLAR.length) % EKRANLAR.length;
  const [ad, tr, en] = EKRANLAR[galeriSira];
  const resim = $("#galeri-resim");
  resim.src = `assets/${proje}/${ad}.webp`;
  resim.alt = dil === "en" ? en : tr;
  resim.style.animation = "none";
  resim.offsetWidth;
  resim.style.animation = "";
  $("#galeri-yazi").textContent = `${galeriSira + 1} / ${EKRANLAR.length} · ${resim.alt}`;
  noktalar.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-current", j === galeriSira));
}

function sekmeAc(ad) {
  onizleme.querySelectorAll("[data-sekme]").forEach((b) => b.setAttribute("aria-selected", b.dataset.sekme === ad));
  onizleme.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== ad));
  if (ad === "video") onizlemeVideo.play().catch(() => {});
  else {
    onizlemeVideo.pause();
    galeriGoster(galeriSira);
  }
}

document.querySelectorAll("[data-onizle]").forEach((b) =>
  b.addEventListener("click", () => {
    projeSec(b.dataset.proje || "qr");
    onizleme.showModal();
    sekmeAc(b.dataset.onizle);
  })
);
onizleme.querySelectorAll("[data-sekme]").forEach((b) => b.addEventListener("click", () => sekmeAc(b.dataset.sekme)));
$(".gal-prev").addEventListener("click", () => galeriGoster(galeriSira - 1));
$(".gal-next").addEventListener("click", () => galeriGoster(galeriSira + 1));
$("[data-kapat]").addEventListener("click", () => onizleme.close());
onizleme.addEventListener("click", (e) => { if (e.target === onizleme) onizleme.close(); });
onizleme.addEventListener("close", () => onizlemeVideo.pause());
onizleme.addEventListener("keydown", (e) => {
  if ($('[data-panel="galeri"]').hidden) return;
  if (e.key === "ArrowRight") galeriGoster(galeriSira + 1);
  if (e.key === "ArrowLeft") galeriGoster(galeriSira - 1);
});

// Hero görselleri fareyle hafifçe hareket eder
const heroArt = $(".hero-art");
if (heroArt && !azHareket && matchMedia("(pointer: fine)").matches) {
  $(".hero").addEventListener("pointermove", (e) => {
    const r = heroArt.parentElement.getBoundingClientRect();
    heroArt.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    heroArt.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  });
}
