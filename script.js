const kok = document.documentElement;
const $ = (s) => document.querySelector(s);

// Tema değiştirme
const temaBtn = $("#tema");
const temaIkonu = () => (temaBtn.textContent = kok.dataset.theme === "light" ? "☾" : "☀");
temaBtn.addEventListener("click", () => {
  const yeni = kok.dataset.theme === "light" ? "dark" : "light";
  kok.dataset.theme = yeni;
  try { localStorage.setItem("tema", yeni); } catch (e) {}
  temaIkonu();
});
temaIkonu();

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
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(daktilo, 2000);

// Kaydırma: ilerleme çubuğu, yukarı butonu, aktif menü bağlantısı
const ilerleme = $("#ilerleme");
const yukari = $("#yukari");
const bolumler = [...document.querySelectorAll("main section[id]")];
function kaydirma() {
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
const RENKLER = { JavaScript: "#f1e05a", HTML: "#e34c26", CSS: "#563d7c", Python: "#3572A5", Java: "#b07219", "C#": "#178600", Dart: "#00B4AB", TypeScript: "#3178c6" };
const kacis = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

let repoVerisi = null;

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
      <p>${kacis(r.description || m.aciklamaYok)}</p>
      <div class="repo-meta">
        ${r.language ? `<span><i class="lang-dot" style="background:${RENKLER[r.language] || "var(--accent)"}"></i>${kacis(r.language)}</span>` : ""}
        <span>★ ${r.stargazers_count}</span>
        <span>${new Date(r.pushed_at).toLocaleDateString(m.tarih, { month: "short", year: "numeric" })}</span>
      </div>
    </a>`).join("");
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
    $("#stat-repo").textContent = repoVerisi.length;
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

diliUygula();
repolariYukle();
kaydirma();
