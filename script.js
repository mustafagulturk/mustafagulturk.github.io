const kok = document.documentElement;
const $ = (s) => document.querySelector(s);

// Tema değiştirme
$("#tema").addEventListener("click", () => {
  const yeni = kok.dataset.theme === "light" ? "dark" : "light";
  kok.dataset.theme = yeni;
  try { localStorage.setItem("tema", yeni); } catch (e) {}
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

// Daktilo efekti
const unvanlar = ["Yazılım Geliştirici", "Web Geliştirici", "Problem Çözücü", "Sürekli Öğrenen"];
const yazi = $("#yazi");
let ui = 0, ci = unvanlar[0].length, siliniyor = true;
function daktilo() {
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
    goster("E-posta kopyalandı");
  } catch (e) {
    goster("mustafagulturk153@gmail.com");
  }
});

// GitHub API'den herkese açık repoları çek
const RENKLER = { JavaScript: "#f1e05a", HTML: "#e34c26", CSS: "#563d7c", Python: "#3572A5", Java: "#b07219", "C#": "#178600", Dart: "#00B4AB", TypeScript: "#3178c6" };
const kacis = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function repolariYukle() {
  const kutu = $("#repolar");
  try {
    const res = await fetch("https://api.github.com/users/mustafagulturk/repos?sort=updated&per_page=12");
    if (!res.ok) throw new Error(res.status);
    const repolar = (await res.json()).filter((r) => !r.fork);
    $("#stat-repo").textContent = repolar.length;
    if (!repolar.length) {
      kutu.innerHTML = '<p class="section-sub">Henüz herkese açık repo yok.</p>';
      return;
    }
    kutu.innerHTML = repolar.slice(0, 6).map((r) => `
      <a class="repo" href="${kacis(r.html_url)}" target="_blank" rel="noopener">
        <h4>${kacis(r.name)}</h4>
        <p>${kacis(r.description || "Açıklama eklenmemiş.")}</p>
        <div class="repo-meta">
          ${r.language ? `<span><i class="lang-dot" style="background:${RENKLER[r.language] || "var(--accent)"}"></i>${kacis(r.language)}</span>` : ""}
          <span>★ ${r.stargazers_count}</span>
          <span>${new Date(r.pushed_at).toLocaleDateString("tr-TR", { month: "short", year: "numeric" })}</span>
        </div>
      </a>`).join("");
  } catch (e) {
    $("#stat-repo").textContent = "3+";
    kutu.innerHTML = '<p class="section-sub">Repolar şu an yüklenemedi. Aşağıdaki butondan GitHub profilime gidebilirsin.</p>';
  }
}
repolariYukle();
kaydirma();
