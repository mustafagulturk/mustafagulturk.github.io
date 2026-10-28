/**
 * 29 Ekim Cumhuriyet Bayramı süsleri: kutlama şeridi (oda + klasik görünüm) ve hero'da bir kerelik konfeti.
 * Yalnızca <html class="bayram"> iken index.html tarafından yüklenir.
 */
(() => {
  const kok = document.documentElement;
  if (!kok.classList.contains("bayram")) return;

  const KAPALI = "bayramSeritKapali";
  const yil = parseInt(kok.dataset.cumhuriyetYili, 10) || new Date().getFullYear() - 1923;

  // Ay-yıldız: bayrak kanunundaki oranlar (G = 800 birim)
  const HILAL = "M594 293.05A200 200 0 1 0 594 506.95A160 160 0 1 1 594 293.05Z";
  const YILDIZ = "M483.3 400L552.4 377.5L552.4 304.9L595.1 363.7L664.2 341.2L621.5 400L664.2 458.8L595.1 436.3L552.4 495.1L552.4 422.5Z";
  const AY_YILDIZ = `<svg class="bs-ay" viewBox="215 190 470 420" aria-hidden="true"><path d="${HILAL}"/><path d="${YILDIZ}"/></svg>`;

  function sira(n) {
    const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" })[n % 10] || "th";
    return n + s;
  }
  const METIN = {
    tr: { ana: `Cumhuriyetimizin ${yil}. yılı kutlu olsun`, tarih: "29 Ekim 1923", kapat: "Kutlama şeridini kapat" },
    en: { ana: `Happy ${sira(yil)} anniversary of the Republic of Türkiye`, tarih: "29 October 1923", kapat: "Close the celebration banner" },
  };

  let kapali = false;
  try { kapali = sessionStorage.getItem(KAPALI) === "1"; } catch (e) {}

  const seritler = [];
  function seritYap(tur) {
    const el = document.createElement("div");
    el.className = `bayram-serit bs-${tur}`;
    el.setAttribute("role", "note");
    el.innerHTML = `${AY_YILDIZ}<span class="bs-metin"><strong></strong><small></small></span><button type="button" class="bs-kapat"><span aria-hidden="true">×</span></button>`;
    el.querySelector(".bs-kapat").addEventListener("click", () => {
      try { sessionStorage.setItem(KAPALI, "1"); } catch (e) {}
      for (const s of seritler) s.remove();
      kok.classList.remove("bayram-serit-var");
    });
    seritler.push(el);
    return el;
  }

  function dilYaz() {
    const m = METIN[kok.lang === "en" ? "en" : "tr"];
    for (const s of seritler) {
      s.querySelector("strong").textContent = m.ana;
      s.querySelector("small").textContent = m.tarih;
      s.querySelector(".bs-kapat").setAttribute("aria-label", m.kapat);
    }
  }

  // Konfeti: kırmızı-beyaz kâğıtlar ve birkaç küçük ay-yıldız, ~3 sn sonra tuval kaldırılır
  let konfetiAtildi = false;
  function konfeti() {
    if (konfetiAtildi || kok.classList.contains("oda-modu")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const hr = hero.getBoundingClientRect();
    if (hr.bottom < 80 || hr.top > innerHeight) return; // hero ekranda değilse boşuna atma
    konfetiAtildi = true;

    const tuval = document.createElement("canvas");
    tuval.className = "bayram-konfeti";
    tuval.setAttribute("aria-hidden", "true");
    document.body.append(tuval);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = innerWidth, h = innerHeight;
    tuval.width = w * dpr; tuval.height = h * dpr;
    const ctx = tuval.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hilal = new Path2D(HILAL), yildiz = new Path2D(YILDIZ);
    const acik = kok.dataset.theme === "light";

    const adet = Math.round(Math.min(140, Math.max(60, w / 9)));
    const parcalar = Array.from({ length: adet }, (_, i) => {
      // İki yandan, hafif yukarı doğru fışkırır
      const sol = i % 2 === 0;
      const aci = (sol ? -55 : -125) + (Math.random() - 0.5) * 40;
      const hiz = (0.55 + Math.random() * 0.6) * Math.min(h, 900) * 0.0225;
      return {
        x: sol ? -10 : w + 10, y: Math.max(hr.top, 0) + h * (0.35 + Math.random() * 0.2),
        vx: Math.cos((aci * Math.PI) / 180) * hiz, vy: Math.sin((aci * Math.PI) / 180) * hiz,
        d: Math.random() * Math.PI * 2, vd: (Math.random() - 0.5) * 0.3,
        sal: Math.random() * Math.PI * 2,
        ay: i % 14 === 0, kirmizi: Math.random() < 0.62,
        en: 5 + Math.random() * 4, boy: 8 + Math.random() * 6,
      };
    });

    const SURE = 3200;
    let gecen = 0, onceki = 0;
    function ciz(t) {
      // Kare hızından bağımsız; ana iş parçacığı takılırsa (3D sahne yüklenirken) süre o kadar ilerlemez
      const dt = onceki ? Math.min(t - onceki, 50) : 16.7, k = dt / 16.7, sur = Math.pow(0.985, k);
      onceki = t; gecen += dt;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.min(1, Math.max(0, (SURE - gecen) / 700));
      for (const p of parcalar) {
        p.vy += 0.16 * k; p.vx *= sur; p.vy *= sur;
        p.x += (p.vx + Math.sin((p.sal += 0.08 * k)) * 0.6) * k; p.y += p.vy * k; p.d += p.vd * k;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.d);
        if (p.ay) {
          // Kırmızı yuvarlak rozet üstünde beyaz ay-yıldız
          ctx.fillStyle = "#E30A17";
          ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
          ctx.scale(0.042, 0.042); ctx.translate(-450, -400);
          ctx.fillStyle = "#fff"; ctx.fill(hilal); ctx.fill(yildiz);
        } else {
          ctx.scale(1, Math.cos(p.sal * 1.7)); // dönerken kâğıt gibi incelir
          ctx.fillStyle = p.kirmizi ? "#E30A17" : "#fff";
          ctx.fillRect(-p.en / 2, -p.boy / 2, p.en, p.boy);
          if (!p.kirmizi && acik) { ctx.strokeStyle = "rgb(0 0 0 / .12)"; ctx.lineWidth = 1; ctx.strokeRect(-p.en / 2, -p.boy / 2, p.en, p.boy); }
        }
        ctx.restore();
      }
      if (gecen < SURE) requestAnimationFrame(ciz);
      else tuval.remove();
    }
    requestAnimationFrame(ciz);
  }

  function kur() {
    if (!kapali) {
      const katman = document.getElementById("oda-katman");
      if (katman) katman.append(seritYap("oda"));
      const ust = document.querySelector("header.nav");
      if (ust) ust.append(seritYap("klasik"));
      dilYaz();
      kok.classList.add("bayram-serit-var");
      // Dil hem odadaki hem klasik görünümdeki düğmeyle <html lang> üzerinden değişir
      new MutationObserver(dilYaz).observe(kok, { attributes: true, attributeFilter: ["lang"] });
    }
    // Klasik görünüm: açılışta ya da odadan "Klasik görünüm"e geçince
    if (!kok.classList.contains("oda-modu")) setTimeout(konfeti, 450);
    else {
      const izle = new MutationObserver(() => {
        if (kok.classList.contains("oda-modu")) return;
        izle.disconnect();
        setTimeout(konfeti, 250);
      });
      izle.observe(kok, { attributes: true, attributeFilter: ["class"] });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", kur, { once: true });
  else kur();
})();
