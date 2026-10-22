# mustafagulturk.github.io

Kişisel portfolyo sitem. Projelerimi, yeteneklerimi ve iletişim bilgilerimi içerir.

**Canlı site:** https://mustafagulturk.github.io

## Teknolojiler

- HTML5, CSS3 (CSS değişkenleri, Grid, Flexbox, animasyonlar)
- Vanilla JavaScript (framework yok, build adımı yok)
- GitHub REST API
- GitHub Pages ile yayınlama

## Özellikler

- **Türkçe / İngilizce dil desteği**: Tek tıkla dil değişir, seçim hatırlanır.
- **Yazdırılabilir CV sayfası** (`cv.html`): Tarayıcıdan tek tıkla A4 PDF olarak indirilebilir.
- **Dil istatistikleri**: Tüm repolardaki kod dağılımı GitHub API ile hesaplanıp grafikle gösterilir.
- **GitHub API entegrasyonu**: Son güncellenen repolar dil, yıldız ve tarih bilgisiyle canlı olarak listelenir.
- **Açık / koyu tema**: View Transitions API ile butondan yayılan dairesel geçiş ve animasyonlu güneş/ay ikonu var. Sistem tercihine uyar ve seçim hatırlanır.
- **Etkileşimli arka plan**: Hero bölümünde fareye tepki veren, birbirine bağlanan parçacıklar (Canvas API) var. Ekran dışındayken animasyon durur.
- **3D sahne**: Three.js ile gürültüyle dalgalanan bir çekirdek ve etrafında dönen proje ekranları (tıklayınca projenin önizlemesi açılır), kaydırdıkça kameranın içinden süzüldüğü yıldız alanı. Kendi GLSL shader'ları, açık/koyu temaya uyum; WebGL yoksa eski görünüme düşer, "hareketi azalt" açıksa sahne sabit durur.
- **Efektler**: Proje kartlarında 3D eğim, kartların sırayla belirmesi, sayaç animasyonu ve buton parlaması.
- **Daktilo efekti** ve ekrana giren bölümler için yumuşak animasyonlar.
- Kartlarda fareyi takip eden ışık efekti.
- **Kaydırma ilerleme çubuğu**, aktif menü vurgusu ve yukarı çık butonu.
- **Mobil uyumlu**: Küçük ekranlarda açılır menü var.
- **Erişilebilirlik**: "İçeriğe geç" bağlantısı, klavye odak göstergeleri, ARIA etiketleri ve `prefers-reduced-motion` desteği (hareket azaltılınca tüm animasyonlar kapanır).
- **Akıllı menü**: Aşağı kaydırınca gizlenir, yukarı kaydırınca geri gelir.
- **SEO ve paylaşım**: Open Graph görseli (LinkedIn/WhatsApp önizlemesi), `sitemap.xml`, `robots.txt`, canonical bağlantısı ve özel 404 sayfası.

## Yerelde çalıştırma

```bash
git clone https://github.com/mustafagulturk/mustafagulturk.github.io.git
cd mustafagulturk.github.io
python3 -m http.server 8000   # http://localhost:8000
```
