/**
 * Poster duvarına yaklaşınca çalan stadyum havası. Ses dosyası yok, hepsi tarayıcıda üretilir:
 * tribün uğultusu (süzülmüş gürültü, dalga dalga kabarır), tezahürat alkışı ve tarayıcının
 * konuşma sesiyle spiker gibi "¡Cristiano!" anonsları; anonsla birlikte tribün coşar. Geri çıkınca yavaşça kısılır.
 */

// spiker gibi: uzatılmış ünlüler, coşkulu tekrarlar
const ANONSLAR = [
  "¡Cristianooooooo! ¡Cristiano Ronaldooo!",
  "¡Es el número uno! ¡Cristiano Ronaldo!",
  "¡Golazooo! ¡Cristianooooo!",
];
const ARALIK = 10000; // anonslar arası, ms
let ses = null; // { ctx, ana, tribun, zamanlayici, alkisZamanlayici, alkisTampon, sonrakiAlkis }

function gurultuTamponu(ctx, saniye) {
  const t = ctx.createBuffer(1, ctx.sampleRate * saniye, ctx.sampleRate);
  const d = t.getChannelData(0);
  let son = 0;
  for (let i = 0; i < d.length; i++) {
    son = son * 0.86 + (Math.random() * 2 - 1) * 0.14; // pembeye yakın, yumuşak gürültü
    d[i] = son * 3.2;
  }
  return t;
}

/** Sürekli tribün uğultusu; dönen kazanç düğümü coşku anlarında kabartılır. */
function tribun(ctx, hedef) {
  const kaynak = ctx.createBufferSource();
  kaynak.buffer = gurultuTamponu(ctx, 4);
  kaynak.loop = true;
  const bant = ctx.createBiquadFilter();
  bant.type = "bandpass";
  bant.frequency.value = 650;
  bant.Q.value = 0.6;
  const kazanc = ctx.createGain();
  kazanc.gain.value = 0.28;
  for (const [hiz, derin] of [[0.09, 0.1], [0.23, 0.05]]) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = hiz;
    const l = ctx.createGain();
    l.gain.value = derin;
    lfo.connect(l).connect(kazanc.gain);
    lfo.start();
  }
  kaynak.connect(bant).connect(kazanc).connect(hedef);
  kaynak.start();
  return kazanc;
}

function alkis(s, zaman, guc) {
  const { ctx, ana, alkisTampon } = s;
  const k = ctx.createBufferSource();
  k.buffer = alkisTampon;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1500;
  f.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, zaman);
  g.gain.exponentialRampToValueAtTime(0.45 * guc, zaman + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, zaman + 0.14);
  k.connect(f).connect(g).connect(ana);
  k.start(zaman, Math.random() * 0.5, 0.16);
}

/** Tezahürat alkışı: iki yavaş, üç hızlı; birkaç saniye önceden planlanır. */
function alkisPlanla(s) {
  const V = 0.5;
  while (s.sonrakiAlkis < s.ctx.currentTime + 3) {
    const t = s.sonrakiAlkis;
    for (const [d, guc] of [[0, 1], [V, 1], [V * 2, 0.8], [V * 2.5, 0.8], [V * 3, 1]]) alkis(s, t + d, guc);
    s.sonrakiAlkis += V * 4;
  }
}

function cosku(s) {
  const { ctx, tribun: k } = s;
  const t = ctx.currentTime;
  k.gain.cancelScheduledValues(t);
  k.gain.setValueAtTime(k.gain.value, t);
  k.gain.linearRampToValueAtTime(0.85, t + 0.4);
  k.gain.linearRampToValueAtTime(0.28, t + 3.5);
}

function anonsYap(s, sira) {
  if (!("speechSynthesis" in window)) return cosku(s);
  const u = new SpeechSynthesisUtterance(ANONSLAR[sira % ANONSLAR.length]);
  u.lang = "es-ES";
  const sesler = speechSynthesis.getVoices();
  u.voice = sesler.find((v) => v.lang.startsWith("es") && /male|jorge|diego|pablo|alvaro/i.test(v.name)) || sesler.find((v) => v.lang.startsWith("es")) || null;
  u.rate = 0.95;
  u.pitch = 1.15;
  u.volume = 1;
  u.onstart = () => ses === s && cosku(s);
  speechSynthesis.speak(u);
}

export function muzikCal() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || ses) return;
  const ctx = new AC();
  ctx.resume?.();
  const ana = ctx.createGain();
  ana.gain.setValueAtTime(0.0001, ctx.currentTime);
  ana.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 1);
  ana.connect(ctx.destination);
  const s = (ses = { ctx, ana, tribun: tribun(ctx, ana), alkisTampon: gurultuTamponu(ctx, 1), sonrakiAlkis: ctx.currentTime + 0.6 });
  alkisPlanla(s);
  s.alkisZamanlayici = setInterval(() => alkisPlanla(s), 1000);
  let sira = 0;
  const ilk = setTimeout(() => anonsYap(s, sira++), 900);
  s.zamanlayici = setInterval(() => anonsYap(s, sira++), ARALIK);
  s.ilk = ilk;
}

export function muzikDurdur() {
  if (!ses) return;
  const s = ses;
  ses = null;
  clearTimeout(s.ilk);
  clearInterval(s.zamanlayici);
  clearInterval(s.alkisZamanlayici);
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const t = s.ctx.currentTime;
  s.ana.gain.cancelScheduledValues(t);
  s.ana.gain.setValueAtTime(s.ana.gain.value, t);
  s.ana.gain.linearRampToValueAtTime(0.0001, t + 0.9);
  setTimeout(() => s.ctx.close(), 1100);
}
