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
- **Sistem ve gömülü projeler bölümü**: Radar Target Tracker (C++/Kalman/Qt), Taktik Mesaj Ağ Geçidi (Go/TCP) ve Gömülü Telemetri (C/STM32/FreeRTOS) için Problem / Yaklaşım / Sonuç kartları ve ölçülen değerler.
- **Dil istatistikleri**: Tüm repolardaki kod dağılımı GitHub API ile hesaplanıp grafikle gösterilir.
- **GitHub API entegrasyonu**: Son güncellenen repolar dil, yıldız ve tarih bilgisiyle canlı olarak listelenir.
- **Açık / koyu tema**: View Transitions API ile butondan yayılan dairesel geçiş ve animasyonlu güneş/ay ikonu var. Sistem tercihine uyar ve seçim hatırlanır.
- **Etkileşimli arka plan**: Hero bölümünde fareye tepki veren, birbirine bağlanan parçacıklar (Canvas API) var. Ekran dışındayken animasyon durur.
- **3D çalışma odası**: Site Three.js ile kurulmuş bir çalışma odasında açılır. Masadaki nesnelere tıklayınca kamera yaklaşır: monitörde projeler, telefonda oyun seçme ekranı (Ocakbaşı dikey, Okey Salonu seçilince telefon yan dönüp yatay oynanır), saksıdaki çınar fidanında deneysel Çınar dil modeli, rafta yetenekler, diplomada hakkımda, zarfta iletişim, defterde CV. Masa L şeklinde: sol kanattaki laboratuvar köşesinde radar konsolu (taraması dönen PPI ekranı), Nucleo kartı (1 Hz yanıp sönen LED) ve ağ anahtarı (arada bozuk paketi kırmızıyla gösteren port LED'leri) sistem projelerini açar. Kamera yerinde durur, bakış fareyi takip eder. Sola bakınca yan duvarda Gültürk kasabı köşesi görünür: ahşap tabela ve mıknatıslı çıtada satır ile bıçaklar. Pencereden Gaziantep Kalesi görünür; temaya göre gece ya da gündüz olur. WebGL yoksa normal siteye düşer, "Klasik görünüm" butonuyla da normal siteye geçilebilir (tercih hatırlanır).
- **Klasik görünümde 3D yörünge**: Klasik sayfanın başında, etrafında proje ekranlarının döndüğü parlayan bir çekirdek var (`yorunge.js`). Masaüstünde başlık ekrana sabitlenir; kaydırdıkça yörünge döner ve her proje sırayla öne gelir, sağ altta adı ve önizleme butonu görünür. Sonra kamera yıldız alanında aşağı süzülür.
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

## 3D odayı kendin değiştirmek istersen

| Ne | Nerede |
|---|---|
| Odanın kendisi (masa, raf, lamba, renkler, kamera açıları) | `oda.js` |
| Tıklanabilir nesneler ve kameranın nereye yaklaşacağı | `oda.js` → `etkilesimler` listesi |
| Nesneye yaklaşınca açılan HTML (monitördeki projeler, yan paneller) | `index.html` → `#oda-katman` |
| Odayla sayfa arasındaki bağlantı, klasik görünüme geçiş | `oda-arayuz.js` |
| Panel ve butonların görünümü | `oda.css` |
| İngilizce metinler | `i18n.js` → `oda.*` anahtarları |
| Klasik görünümdeki yörüngede dönen projeler, dönüş hızı | `yorunge.js` → `PROJELER`, `DONUS_HIZI` |
| Başlığın ne kadar kaydırma boyunca sabit kalacağı | `style.css` → `.yorunge-pin .hero-pin` yüksekliği |

**Örnek: monitöre yeni bir proje eklemek.** `index.html` içinde `#oda-monitor` altındaki `om-kart` bloklarından birini kopyalayıp görseli, başlığı ve linkleri değiştirmek yeterli. Metni `data-i18n` ile verirsen İngilizcesini `i18n.js`'e eklemeyi unutma.
