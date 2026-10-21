// Tema: kayıtlı tercih yoksa sistem temasını kullan
const kok = document.documentElement;
try {
  const kayitli = localStorage.getItem("tema");
  if (kayitli) kok.dataset.theme = kayitli;
  else if (matchMedia("(prefers-color-scheme: light)").matches) kok.dataset.theme = "light";
} catch (e) {}

document.getElementById("tema").addEventListener("click", () => {
  const yeni = kok.dataset.theme === "light" ? "dark" : "light";
  kok.dataset.theme = yeni;
  try { localStorage.setItem("tema", yeni); } catch (e) {}
});

document.getElementById("yil").textContent = new Date().getFullYear();

// Bölümleri ekrana girince yumuşakça göster
const gozlemci = new IntersectionObserver((girdiler) => {
  girdiler.forEach((g) => {
    if (g.isIntersecting) {
      g.target.classList.add("visible");
      gozlemci.unobserve(g.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".section").forEach((s) => {
  s.classList.add("reveal");
  gozlemci.observe(s);
});
