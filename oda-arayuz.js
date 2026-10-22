/**
 * 3D odanın sayfayla bağlantısı: odayı açar/kapatır, nesneye yaklaşılınca ilgili HTML katmanını gösterir.
 * WebGL yoksa ya da ziyaretçi "Klasik görünüm"ü seçtiyse normal site gösterilir.
 */
import { odaBaslat } from "./oda.js";

const kok = document.documentElement;
const $ = (s) => document.querySelector(s);
const katman = $("#oda-katman");
const monitor = $("#oda-monitor");
const telefon = $("#oda-telefon");
const telefonNot = $("#oda-telefon-not");
const panel = $("#oda-panel");
const odayaDon = $("#odaya-don");

let oda = null;

function klasigeGec() {
  kok.classList.remove("oda-modu");
  katman.hidden = true;
  odayaDon.hidden = false;
  try { localStorage.setItem("gorunum", "klasik"); } catch {}
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
    const iframe = telefon.querySelector("iframe");
    if (!iframe.src) iframe.src = iframe.dataset.src;
    yerlestir(telefon, dikdortgen);
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
    return;
  }
  // Nesne başlıklarını dile göre çevir
  const BASLIK_EN = { monitor: "Projects", telefon: "Play Ocakbaşı", raf: "Skills", diploma: "About me", pencere: "Gaziantep", zarf: "Contact", defter: "CV" };
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
katman.querySelectorAll("[data-oda-git]").forEach((b) => b.addEventListener("click", () => oda?.odaklan(b.dataset.odaGit)));

if (kok.classList.contains("oda-modu")) {
  katman.hidden = false;
  kur();
} else {
  odayaDon.hidden = false;
}

// Otomatik testler için: document.dispatchEvent(new CustomEvent("oda-test", { detail: "monitor" }))
document.addEventListener("oda-test", (e) => oda?.odaklan(e.detail));
