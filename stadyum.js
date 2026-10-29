/**
 * Poster duvarına yaklaşınca çalan tribün sesi. Ses dosyası yok, hepsi Web Audio ile üretilir:
 *   - üç bantlı uğultu (alçak gümbürtü, orta kalabalık, tiz ıslık), sağa sola yayılmış
 *   - davul ve yüzlerce elden çıkıyormuş gibi toplu alkış (iki yavaş, üç hızlı)
 *   - her iki ölçü sonunda "Hey!" bağırışı
 *   - her 16 vuruşta gol anı: uğultu kopar, kornalar çalar, kalabalık "ooo" diye yükselir
 * Geri çıkınca yavaşça kısılır. Aynı sahne önizleme kaydı için çevrimdışı da çizilebilir.
 */

const V = 0.5; // vuruş, saniye (120 BPM)
const GOL_ARASI = 16; // vuruş

function gurultuTamponu(ctx, saniye) {
  const t = ctx.createBuffer(1, Math.round(ctx.sampleRate * saniye), ctx.sampleRate);
  const d = t.getChannelData(0);
  let son = 0;
  for (let i = 0; i < d.length; i++) {
    son = son * 0.86 + (Math.random() * 2 - 1) * 0.14; // pembeye yakın, yumuşak gürültü
    d[i] = son * 3.2;
  }
  return t;
}

function lfo(ctx, hedefParam, hiz, derin) {
  const o = ctx.createOscillator();
  o.frequency.value = hiz;
  const g = ctx.createGain();
  g.gain.value = derin;
  o.connect(g).connect(hedefParam);
  o.start();
}

/** Tribün sahnesini kurar; dönen planla(t0, t1) o aralıktaki olayları yerleştirir. */
export function stadyumSahnesi(ctx, hedef) {
  const kompres = ctx.createDynamicsCompressor();
  kompres.threshold.value = -18;
  kompres.ratio.value = 4;
  kompres.attack.value = 0.01;
  kompres.release.value = 0.3;
  kompres.connect(hedef);

  // stadyum yankısı: iki kısa, geri beslemeli gecikme
  const yanki = ctx.createGain();
  yanki.gain.value = 0.5;
  for (const [sure, geriG] of [[0.13, 0.3], [0.29, 0.25]]) {
    const d = ctx.createDelay();
    d.delayTime.value = sure;
    const g = ctx.createGain();
    g.gain.value = geriG;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 3000;
    yanki.connect(d).connect(f).connect(g).connect(d);
    f.connect(kompres);
  }
  const kuru = ctx.createGain();
  kuru.connect(kompres);
  kuru.connect(yanki);

  // 1) sürekli uğultu: üç bant, her biri ayrı tampon ve konum
  const tribun = ctx.createGain();
  tribun.gain.value = 1;
  tribun.connect(kuru);
  const tiz = ctx.createGain();
  for (const [frekans, q, kazanc, pan, hedefG] of [[220, 0.7, 0.42, -0.5, tribun], [800, 0.8, 0.3, 0.1, tribun], [2300, 1.1, 0.07, 0.6, tiz]]) {
    const k = ctx.createBufferSource();
    k.buffer = gurultuTamponu(ctx, 5);
    k.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = frekans;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = kazanc;
    lfo(ctx, g.gain, 0.07 + Math.random() * 0.15, kazanc * 0.3);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (p.pan) { p.pan.value = pan; lfo(ctx, p.pan, 0.05, 0.25); }
    k.connect(f).connect(g).connect(p).connect(hedefG);
    k.start();
  }
  tiz.gain.value = 1;
  tiz.connect(kuru);

  const alkisTampon = gurultuTamponu(ctx, 1);

  function alkis(z, guc) {
    // tek el değil kalabalık: birkaç katman, her biri birkaç ms kaymış
    for (let i = 0; i < 5; i++) {
      const t = z + (Math.random() - 0.5) * 0.03;
      const k = ctx.createBufferSource();
      k.buffer = alkisTampon;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1200 + Math.random() * 900;
      f.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16 * guc, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) { p.pan.value = Math.random() * 1.6 - 0.8; k.connect(f).connect(g).connect(p).connect(kuru); }
      else k.connect(f).connect(g).connect(kuru);
      k.start(t, Math.random() * 0.6, 0.16);
    }
  }

  function davul(z, guc = 1) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, z);
    o.frequency.exponentialRampToValueAtTime(42, z + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, z);
    g.gain.exponentialRampToValueAtTime(0.9 * guc, z + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, z + 0.4);
    o.connect(g).connect(kuru);
    o.start(z);
    o.stop(z + 0.45);
  }

  /** "Hey!": kalabalığın ünlüsü gibi biçimlenmiş kısa gürültü patlaması. */
  function hey(z) {
    const k = ctx.createBufferSource();
    k.buffer = alkisTampon;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, z);
    g.gain.exponentialRampToValueAtTime(0.5, z + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, z + 0.35);
    for (const [frekans, q] of [[650, 5], [1150, 6], [2400, 4]]) {
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(frekans, z);
      f.frequency.linearRampToValueAtTime(frekans * 0.9, z + 0.3);
      f.Q.value = q;
      k.connect(f).connect(g);
    }
    g.connect(kuru);
    k.start(z, Math.random() * 0.4, 0.4);
  }

  function korna(z) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, z);
    g.gain.exponentialRampToValueAtTime(0.05, z + 0.05);
    g.gain.setValueAtTime(0.05, z + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, z + 1.4);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1800;
    f.connect(g).connect(kuru);
    for (const frekans of [233, 294, 349, 466]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = frekans * (1 + (Math.random() - 0.5) * 0.01);
      o.connect(f);
      o.start(z + Math.random() * 0.08);
      o.stop(z + 1.5);
    }
  }

  /** Kalabalığın yükselen "ooo"su: çok sayıda hafif ayrık ses, ünlü süzgecinden. */
  function ooo(z) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, z);
    g.gain.linearRampToValueAtTime(0.07, z + 0.8);
    g.gain.linearRampToValueAtTime(0.0001, z + 4);
    const f1 = ctx.createBiquadFilter();
    f1.type = "bandpass"; f1.frequency.value = 480; f1.Q.value = 3;
    const f2 = ctx.createBiquadFilter();
    f2.type = "bandpass"; f2.frequency.value = 850; f2.Q.value = 4;
    f1.connect(g); f2.connect(g);
    g.connect(kuru);
    for (let i = 0; i < 14; i++) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      const taban = 147 * (i % 3 === 0 ? 2 : 1) * (1 + (Math.random() - 0.5) * 0.03);
      o.frequency.setValueAtTime(taban, z);
      o.frequency.linearRampToValueAtTime(taban * 1.12, z + 1.2);
      o.connect(i % 2 ? f1 : f2);
      o.start(z);
      o.stop(z + 4.1);
    }
  }

  function gol(z) {
    for (const [p, taban] of [[tribun.gain, 1], [tiz.gain, 1]]) {
      p.setValueAtTime(taban, z);
      p.linearRampToValueAtTime(p === tiz.gain ? 4 : 2.4, z + 0.6);
      p.linearRampToValueAtTime(taban, z + 5);
    }
    korna(z + 0.2);
    ooo(z + 0.1);
  }

  let vurus = 0;
  let sonraki = null;
  function planla(t0, t1) {
    if (sonraki === null) sonraki = t0;
    while (sonraki < t1) {
      const t = sonraki, olcu = vurus % 4;
      // davul ve alkış: iki yavaş, üç hızlı
      if (olcu === 0 || olcu === 1) { davul(t); alkis(t, 1); }
      if (olcu === 2) { davul(t, 0.8); alkis(t, 0.8); alkis(t + V / 2, 0.8); }
      if (olcu === 3) { davul(t); alkis(t, 1); }
      if (vurus % 8 === 7) hey(t + V * 0.5);
      if (vurus % GOL_ARASI === GOL_ARASI - 2) gol(t + V);
      vurus++;
      sonraki += V;
    }
  }
  return { planla };
}

let ses = null; // { ctx, ana, sahne, zamanlayici }

export function muzikCal() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || ses) return;
  const ctx = new AC();
  ctx.resume?.();
  const ana = ctx.createGain();
  ana.gain.setValueAtTime(0.0001, ctx.currentTime);
  ana.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 1.2); // gol anında tepe 1.2’ye çıkar, kırpılmasın
  ana.connect(ctx.destination);
  const sahne = stadyumSahnesi(ctx, ana);
  sahne.planla(ctx.currentTime + 0.5, ctx.currentTime + 3);
  const s = (ses = { ctx, ana, sahne });
  s.zamanlayici = setInterval(() => s.sahne.planla(s.ctx.currentTime, s.ctx.currentTime + 3), 1000);
}

export function muzikDurdur() {
  if (!ses) return;
  const s = ses;
  ses = null;
  clearInterval(s.zamanlayici);
  const t = s.ctx.currentTime;
  s.ana.gain.cancelScheduledValues(t);
  s.ana.gain.setValueAtTime(s.ana.gain.value, t);
  s.ana.gain.linearRampToValueAtTime(0.0001, t + 0.9);
  setTimeout(() => s.ctx.close(), 1100);
}
