/**
 * 3D odanın sayfayla bağlantısı: odayı açar/kapatır, nesneye yaklaşılınca ilgili HTML katmanını gösterir.
 * WebGL yoksa ya da ziyaretçi "Klasik görünüm"ü seçtiyse normal site gösterilir.
 */
import { odaBaslat } from "./oda.js?v=20261026o";

const kok = document.documentElement;
const $ = (s) => document.querySelector(s);
const katman = $("#oda-katman");
const monitor = $("#oda-monitor");
const telefon = $("#oda-telefon");
const telefonNot = $("#oda-telefon-not");
const panel = $("#oda-panel");
const odayaDon = $("#odaya-don");

let oda = null;

// Telefonda oynanabilen oyunlar. Yatay oyun sabit boyutta çizilip telefon kasasına ölçeklenir.
const OYUNLAR = {
  ocakbasi: { ad: "Ocakbaşı", src: "/ocakbasi/", tam: "https://mustafagulturk.github.io/ocakbasi/" },
  okey: { ad: "Okey Salonu", src: "/mobil-okey/", tam: "https://mustafagulturk.github.io/mobil-okey/", yatay: { w: 844, h: 390 } },
};
const telIframe = telefon.querySelector("iframe");
let telDikdortgen = null; // 3D telefonun ekranının sayfadaki yeri
let aktifOyun = null;
let bekleyenOyun = null; // monitördeki "Oyna" ile seçilip telefona gidilen oyun
// Klasik görünümdeki 3D yörünge sahnesi yalnızca klasik görünüm açılınca yüklenir
const yorungeYukle = () => import("./yorunge.js?v=20261025a").catch(() => {});

function klasigeGec() {
  kok.classList.remove("oda-modu");
  katman.hidden = true;
  odayaDon.hidden = false;
  try { localStorage.setItem("gorunum", "klasik"); } catch {}
  yorungeYukle();
}

async function odayaGec() {
  try { localStorage.removeItem("gorunum"); } catch {}
  kok.classList.add("oda-modu");
  katman.hidden = false;
  odayaDon.hidden = true;
  scrollTo({ top: 0 });
  if (!oda) await kur();
}

function katmanlariGizle() {
  for (const el of [monitor, telefon, panel]) {
    el.classList.remove("acik");
    el.hidden = true;
  }
  telefonNot.hidden = true;
}

function yerlestir(el, r) {
  Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
}

/** Yatay telefonu ekranın ortasına, üst çubuk ve alttaki not için yer bırakarak yerleştirir. */
function yatayDikdortgen({ w, h }) {
  const kasa = 10, ust = 70, alt = innerWidth < 700 ? 130 : 96;
  const oran = w / h;
  const icW = Math.min(innerWidth - 32 - 2 * kasa, (innerHeight - ust - alt - 2 * kasa) * oran, 1180);
  const W = icW + 2 * kasa, H = icW / oran + 2 * kasa;
  return { left: (innerWidth - W) / 2, top: ust + Math.max(0, (innerHeight - ust - alt - H) / 2), width: W, height: H };
}

function telefonuYerlestir(animasyonlu) {
  const oyun = aktifOyun && OYUNLAR[aktifOyun];
  telefon.classList.toggle("yatay", !!oyun?.yatay);
  if (!oyun?.yatay) {
    yerlestir(telefon, telDikdortgen);
    telIframe.style.transform = "";
    return;
  }
  const r = yatayDikdortgen(oyun.yatay);
  yerlestir(telefon, r);
  telIframe.style.transform = `scale(${(r.width - 20) / oyun.yatay.w})`;
  if (animasyonlu && telDikdortgen && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Dikey telefondan yan dönerek açılır: başlangıçta yatay kasa 90° döndürülüp dikey ekranın yerine oturtulur
    const d = telDikdortgen;
    telefon.style.setProperty("--dx", `${d.left + d.width / 2 - (r.left + r.width / 2)}px`);
    telefon.style.setProperty("--dy", `${d.top + d.height / 2 - (r.top + r.height / 2)}px`);
    telefon.style.setProperty("--s0", (d.height / r.width).toFixed(3));
    telefon.classList.remove("donuyor");
    void telefon.offsetWidth;
    telefon.classList.add("donuyor");
  }
}

function telefonNotu() {
  const oyun = aktifOyun && OYUNLAR[aktifOyun];
  telefonNot.querySelector("[data-tel-ana]").hidden = !oyun;
  telefonNot.querySelector("[data-tel-sec]").hidden = !!oyun;
  telefonNot.querySelector("[data-tel-oyna]").hidden = !oyun;
  const tam = telefonNot.querySelector("[data-tel-tam]");
  tam.hidden = !oyun;
  if (oyun) tam.href = oyun.tam;
  // Dar ekranda yatay oyun küçük kalır: tam ekran bağlantısını öne çıkar
  tam.classList.toggle("ot-tam-vurgu", !!oyun?.yatay && innerWidth < 700);
}

function oyunAc(ad) {
  if (!OYUNLAR[ad]) return;
  if (aktifOyun !== ad) {
    aktifOyun = ad;
    telIframe.title = OYUNLAR[ad].ad;
    telIframe.src = OYUNLAR[ad].src;
  }
  telefon.classList.add("oyunda");
  telefonuYerlestir(true);
  telefonNotu();
}

function anaEkran() {
  aktifOyun = null;
  telIframe.removeAttribute("src");
  telefon.classList.remove("oyunda", "yatay", "donuyor");
  telefonuYerlestir(false);
  telefonNotu();
  telefon.querySelector(".ot-saat").textContent = new Date().toLocaleTimeString(kok.lang === "en" ? "en-GB" : "tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function goster(el) {
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("acik"));
}

function odakta(ad, dikdortgen) {
  katmanlariGizle();
  if (ad === "monitor") {
    yerlestir(monitor, dikdortgen);
    // Dar ekranda monitörün içi küçük kalır: ekran açılır gibi büyüt
    if (innerWidth < 700) {
      monitor.classList.add("buyuyen");
      setTimeout(() => yerlestir(monitor, { left: 10, top: 70, width: innerWidth - 20, height: innerHeight - 150 }), 380);
    } else monitor.classList.remove("buyuyen");
    monitor.querySelector(".om-saat").textContent = new Date().toLocaleTimeString(kok.lang === "en" ? "en-GB" : "tr-TR", { hour: "2-digit", minute: "2-digit" });
    goster(monitor);
  } else if (ad === "telefon") {
    telDikdortgen = dikdortgen;
    const istenen = bekleyenOyun;
    bekleyenOyun = null;
    // Pencere boyutu değişince de buraya gelinir: açık oyun yeniden yüklenmeden yerleşir
    if (istenen && istenen !== aktifOyun) oyunAc(istenen);
    else if (aktifOyun) { telefonuYerlestir(false); telefonNotu(); }
    else anaEkran();
    goster(telefon);
    telefonNot.hidden = false;
  } else {
    panel.querySelectorAll("[data-oda-panel]").forEach((s) => s.classList.toggle("aktif", s.dataset.odaPanel === ad));
    goster(panel);
  }
}

async function kur() {
  const yukleniyor = $("#oda-yukleniyor");
  oda = await odaBaslat({
    kap: $("#oda-sahne"),
    etiket: $("#oda-etiket"),
    ipucu: $("#oda-ipucu"),
    geri: $("#oda-geri"),
    katmanlar: { gizle: katmanlariGizle },
    onOdak: odakta,
    onCikis: katmanlariGizle,
  });
  if (!oda) {
    // WebGL yok: klasik siteye düş, ama tercih olarak kaydetme
    kok.classList.remove("oda-modu");
    katman.hidden = true;
    yorungeYukle();
    return;
  }
  // Nesne başlıklarını dile göre çevir
  const BASLIK_EN = { monitor: "Projects", telefon: "Play games", raf: "Skills", diploma: "About me", pencere: "Gaziantep", zarf: "Contact", defter: "CV", fidan: "Çınar · language model", radar: "Radar · target tracking", telemetri: "Embedded telemetry board", gecit: "Tactical message gateway" };
  for (const e of oda.etkilesimler) e.baslikCeviri = () => (kok.lang === "en" ? BASLIK_EN[e.ad] : e.baslik);
  yukleniyor.classList.add("bitti");
}

// Butonlar
katman.querySelector("[data-oda-klasik]").addEventListener("click", klasigeGec);
odayaDon.addEventListener("click", odayaGec);
katman.querySelector("[data-oda-tema]").addEventListener("click", () => $("#tema").click());
const dilBtn = katman.querySelector("[data-oda-dil]");
dilBtn.addEventListener("click", () => $("#dil").click());
new MutationObserver(() => (dilBtn.textContent = kok.lang === "en" ? "TR" : "EN")).observe(kok, { attributes: true, attributeFilter: ["lang"] });
dilBtn.textContent = kok.lang === "en" ? "TR" : "EN";
katman.querySelectorAll("[data-oda-git]").forEach((b) =>
  b.addEventListener("click", () => {
    bekleyenOyun = b.dataset.oyun || null;
    oda?.odaklan(b.dataset.odaGit);
  })
);
telefon.querySelectorAll("[data-oyun-sec]").forEach((b) => b.addEventListener("click", () => oyunAc(b.dataset.oyunSec)));
telefonNot.querySelector("[data-tel-ana]").addEventListener("click", anaEkran);
telefon.addEventListener("animationend", (e) => e.target === telefon && telefon.classList.remove("donuyor"));

if (kok.classList.contains("oda-modu")) {
  katman.hidden = false;
  kur();
} else {
  odayaDon.hidden = false;
  yorungeYukle();
}

// Otomatik testler için: document.dispatchEvent(new CustomEvent("oda-test", { detail: "monitor" }))
document.addEventListener("oda-test", (e) => oda?.odaklan(e.detail));
