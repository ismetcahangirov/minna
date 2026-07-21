# Dizayn Spesifikasiyası — Anime Streaming Platform

Bu sənəd `ref.zip`("C:\Users\cahan\OneDrive\Desktop\ref.zip") qovluğundakı şəkil/video fayllarına istinadən istifadə
olunur. Fayl adlarında səhifə/komponent adı olacaq (məs. `home-*`,
`login-*`, `profile-*`, `404-*`, `search-*`, `episode-*`,
`anime-detail-*`, `admin-*`) — dizayner bu naxışa əsasən hansı şəkil/
videonun hansı səhifəyə aid olduğunu müəyyən etməlidir.

**Qeyd:** Video fayllar (.mov) bu alətə birbaşa attach oluna bilmədiyi üçün,
bölmə 6-da hər videonun frame-by-frame analiz edilmiş, dəqiq təsviri
verilib (kompozisiya, rəng palitrası, hərəkət tipi). Statik şəkillər
(webp/png/jpg) birbaşa fayl kimi verilə bilər.

## 1. Dizayn Sistemi

### Rənglər

- Əsas fon: qara (`#000000` və ya çox tünd boz)
- Vurğu rəngi: Netflix logosundakı qırmızı (`#E50914` ton ailəsi)
- İkinci ton qarışığı: mavi–bənövşəyi (`blue → purple`) — YALNIZ ayrıca
  aksent rənglər/kölgələr kimi (bax bölmə 6 — atmosferik fonlar istisna)
- Logo: qırmızı

### Qadağalar (UI Komponentləri üçün Strict Rules)

- ❌ Glassmorphism (bulanıq şüşə effekti) YOX
- ❌ Gradient rənglər YOX (düymə, kart, panel və s. UI komponentlərində)
- ❌ Border-radius YOX — bütün komponentlər sərt/kəskin künclü
- ❌ Emoji YOX

> **Nüans:** bu qadağalar UI komponentlərinə (kart, düymə, panel, header)
> aiddir. Bölmə 6-dakı atmosferik arxa plan video/animasiyaları (login,
> profil, axtarış, 404) fərqli vizual qatdır — orada təbii duman/işıq
> keçidləri (glow) olması normaldır, çünki bunlar video/fotoqrafik
> təbiətli fon effektləridir, düz rəngli UI elementləri deyil.

### İkonlar

- Yalnız SVG ikonlar: `react-icons` və ya `lucide-react`

### Tipoqrafiya

- Netflix-in istifadə etdiyi font (Netflix Sans) açıq lisenziyalı
  olmadığı üçün, vizual olaraq bənzər, sərt/güclü geometrik sans-serif
  alternativ seçilməlidir (məs. Helvetica Neue Bold tərzi və ya bənzər
  açıq-mənbəli font ailəsi). Başlıqlarda qalın çəki, mətndə standart
  çəki istifadə olunmalıdır.

### Animasiya Texnologiyaları

- 3D elementlər: React Three Fiber / Three.js
- Komponent animasiyaları: Framer Motion
- Animasiyalı komponentlər 21st.dev sayt promptları ilə yaradılmalı

## 2. Header (Bütün Səhifələrdə Ortaq)

- Fixed, `top: 0`, arxa plan şəffaf (scroll zamanı fon tündləşə bilər)
- **Sol:** Logo (qırmızı)
- **Orta:** Kateqoriyalar (dropdown, alt-alta + yanaşı elementlər),
  Favoritlər, Yeni, Populyar, Bloqlar, Axtarış linkləri
- **Sağ:** Login düyməsi / profil şəkli (klikləndikdə dropdown), dil
  seçimi dropdown (EN/TR/RU)
- **Mobil/Tablet:** Burger ikon → sağdan slide-in animasiya ilə açılan
  panel menyu

## 3. Səhifə-üzrə Dizayn Təlimatları

### 3.1 Ana Səhifə (`home-*` referansı)

- Hero/banner seksiyası
- Anime kartları: 16:9 nisbətində
- Seksiyalar: Son əlavə edilənlər, Populyar olanlar, Ən yüksək
  reytinqli, Trenddə olanlar
- Kart hover zamanı animasiya (böyümə, kölgə, sürətli önizləmə)

### 3.2 Profil Səhifəsi (`profile-*` referansı)

- Arxa planda tam-ekran animasiya video — bax bölmə 6.2
- İstifadəçi məlumatı, izləmə tarixçəsi, favoritlər preview

### 3.3 Populyar / Bloqlar / Favoritlər Səhifələri

- Kartlar **dikey (vertical)** formatda
- Infinite scroll (IntersectionObserver) — skeleton loading state

### 3.4 Bloq Detal Səhifəsi

- Bloqun şəkli tam-ekran arxa plan kimi
- Məzmun şəklin üzərində, oxunaqlı tünd overlay (flat dark layer,
  gradient yox)

### 3.5 Axtarış Səhifəsi (`search-*` referansı)

- Arxa planda animasiya video — bax bölmə 6.3
- Axtarış input-u mərkəzdə/üstdə, nəticələr aşağıda kartlar şəklində

### 3.6 Login Səhifəsi (`login-*` referansı)

- Arxa planda animasiya video — bax bölmə 6.1
- "Google ilə davam et" düyməsi mərkəzdə

### 3.7 404 Səhifəsi (`404-*` referansı)

- Arxa planda animasiya video — bax bölmə 6.4

### 3.8 Anime Detal Səhifəsi (`anime-detail-*` referansı)

- Başlıq, təsvir, janr/reytinq badge-ləri, bölüm siyahısı
- "Favoritlərə əlavə et" düyməsi

### 3.9 Bölüm İzləmə Səhifəsi (`episode-*` referansı)

- YouTube-vari tam funksional video player dizaynı
- **Reklam overlay dizaynı:**
  - Reklam video frame ilə **tam eyni ölçüdə**, videonun üzərində
  - Sayğac: "Reklam bitir: 5s" geri sayım
  - 5 saniyədən sonra "Reklamı keç ⏭" düyməsi (sağ alt küncdə)
  - Player kontrolları reklam bitdikdən sonra aktiv olur

### 3.10 Admin Paneli (`admin-*` referansı)

- Desktop/böyük tablet dizaynı: `admin_sehifesi_boyuk_tablet_ve_yuxari_ekran_ucun.webp`
  faylına əsaslanır — bax bölmə 6.5 üçün mobil davranış təsviri
- Arxa planda animasiya video (default, admin öz videosunu seçə bilər)
- Tam funksional dashboard: reklam idarəetməsi, video/animasiya
  idarəetməsi, bloq idarəetməsi, istifadəçi idarəetməsi
- Data cədvəlləri sərt künclü, kontrastlı, qara fon üzərində qırmızı
  aksentlərlə

## 4. Responsive Qaydalar

- 3 əsas breakpoint: mobil, tablet, desktop
- Heç bir komponent mobil/tablet versiyada itirilməməli — yalnız
  layout yenidən təşkil olunmalı

## 5. Çıxış Formatı

- Hər səhifə üçün ayrıca desktop/tablet/mobil mockup
- Dizayn tokenləri (rənglər, spacing, tipoqrafiya) ayrıca sənəd/JSON
  kimi verilməli ki, frontend komandası birbaşa Tailwind config-ə
  köçürə bilsin

---

## 6. Referans Animasiya Faylları — Ətraflı Vizual Təsvir

Aşağıdakı təsvirlər hər videodan 5 nöqtədə (başlanğıc, 1/4, 1/2, 3/4, son)
çıxarılmış kadrların birbaşa vizual analizi və ortalama rəng ölçmələrinə
(RGB) əsaslanır. Məqsəd — Claude Design-ın bu atmosferi SVG/CSS/Canvas/
Three.js ilə (və ya real video faylı hosting edilən yerdə `<video loop muted>`
placeholder ilə) sadiq şəkildə bərpa etməsidir.

### 6.1 Login səhifəsi — `login_sehifesi___tablet_ve_yuxari_olculer_ucun.mov`

- **Ölçü:** 736×414 (16:9-a yaxın, tablet/desktop üçün), 4.9 saniyəlik loop
- **Kompozisiya:** Tünd, atmosferik, "sinema-vari" fon planı — aşağı
  kontrastlı, bulanıq (defocused) bir mühit görüntüsü, üzərində login
  kartı/paneli üçün boş, sakit mərkəzi sahə buraxılıb (mətn/düymə
  oxunaqlı qalsın deyə fon qəsdən "boşluqlu" kompozisiya edilib)
- **Rəng palitrası:** Soyuq mavi-boz (slate) ton — ölçülmüş orta RGB
  ≈ `(80, 99, 115)` — yəni tünd mavi-boz duman/dumanlı fon, isti
  rənglər demək olar yoxdur
- **Hərəkət:** Çox yavaş, davamlı "dreamy" sürüşmə/parallaks — 5 kadr
  arasında rəng demək olar sabit qalır (fərq 1-2 RGB vahidi), yəni
  ani kəsim yoxdur, hərəkət **davamlı və axıcı loop**-dur, sürətli
  keçid/flash yoxdur
- **Recreation tövsiyəsi:** Tünd slate-mavi (`#4F6373` ətrafı) əsaslı
  radial glow + incə "noise/fog" SVG filter animasiyası (yavaş
  `translate`/`opacity` loop, 8-15san dövr), mərkəzdə login kartı
  üçün əlavə tündləşdirilmiş overlay sahə

### 6.2 Profil səhifəsi

**Mobil — `profil_sehifesi_mobil_ucun.mov`**

- **Ölçü:** 720×1280 (dik, mobil), 9.9 saniyə
- **Kompozisiya:** Video **tam qaradan başlayır** (fade-in effekti) və
  sonra tünd, isti-boz (warm-grey/qəhvəyi) atmosferik səhnəyə keçir —
  ekranın əksər hissəsi tünd qalır, işıq/detal aşağı-orta hissədə
  cəmləşib (profil kartı üçün yer saxlanılıb)
- **Rəng palitrası:** Tünd qəhvəyi-boz ≈ `(64, 59, 60)` — çox aşağı
  parlaqlıq (brightness ≈ 60/255), demək olar monoxrom, isti tonlu
  kölgə
- **Hərəkət:** `f0` tam qara (fade-in başlanğıcı), sonrakı kadrlar
  demək olar sabit — yəni loop-un əvvəlində qısa fade-in var, qalan
  hissə yavaş atmosferik hərəkət (duman/toz zərrəcikləri)

**Tablet/Web — `profil_sehifesi_tablet_ve_web_ucun.mov`**

- **Ölçü:** 736×414 (üfüqi, tablet/desktop), 18.9 saniyə (daha uzun loop)
- **Kompozisiya:** Mobil versiya ilə eyni əhval-ruhiyyə, lakin üfüqi
  kadrlaşdırma — daha geniş atmosferik mənzərə, tünd, aşağı-kontrast
- **Rəng palitrası:** Tünd boz-yaşılımtıl ≈ `(60, 62, 59)` — mobil
  versiyaya yaxın, cüzi daha soyuq/yaşılımtıl çalar, brightness ≈ 60
- **Hərəkət:** 5 kadr ərzində rəng demək olar sabit (60→61) — çox
  yavaş, sabit atmosferik loop, kəskin keçid yoxdur
- **Recreation tövsiyəsi:** Tünd qəhvəyi-boz zəmin üzərində çox aşağı-
  opacity-li hərəkətli "smoke/ash" hissəcik qatı (particle sistemi
  və ya SVG turbulence filter), 1-2 saniyəlik qara-dan fade-in giriş
  animasiyası mobil versiyada təkrarlanmalı

### 6.3 Axtarış səhifəsi — `search_page.mov`

- **Ölçü:** 736×414, 15.7 saniyə
- **Kompozisiya:** Digər fonlardan fərqli olaraq daha parlaq (brightness
  ≈ 95/255) və fərqli rəng ailəsi — teal/yaşıl-firuzəyi çalarlı
  atmosferik işıqlanma, mərkəzdə axtarış paneli üçün yer buraxılıb
- **Rəng palitrası:** Yaşıl-firuzəyi ≈ `(60, 120, 103)` — digər dörd
  videodan fərqli, daha "canlı"/parlaq bir mühit
- **Hərəkət:** 5 kadr ərzində rəng sabit qalır (~1 vahid fərq) —
  davamlı, sakit glow-pulse tipli loop, sürətli hərəkət yoxdur
- **Recreation tövsiyəsi:** Marka rənglərindən (qara/qırmızı/mavi-
  bənövşəyi) fərqli olaraq bu səhifədə **teal/yaşıl** aksent atmosferik
  fon kimi saxlanmalıdır (brend rənglərinə uyğunlaşdırmaq istəsəniz,
  teal-i mavi-bənövşəyi tona yaxınlaşdıra bilərsiniz, lakin orijinal
  referansda aydın yaşıl-firuzəyi ton var) — yavaş nəfəs alan
  (breathing) radial glow animasiyası, 6-10san dövr

### 6.4 404 səhifəsi — `404_sehifesi_.mov`

- **Ölçü:** 1280×720 (tam üfüqi/desktop), 16.7 saniyə
- **Kompozisiya:** Ən isti/parlaq fon (brightness ≈ 104-110/255) —
  qəhvəyi-narıncı, "köz/xarab siqnal" əhval-ruhiyyəsi, mərkəzi sahə
  404 mətni/qrafikası üçün boş saxlanılıb
- **Rəng palitrası:** İsti qəhvəyi-narıncı ≈ `(138, 97, 84)` — digər
  bütün fonlardan daha isti/parlaq ton
- **Hərəkət:** 5 kadr arasında parlaqlıq yüngül dalğalanır (104 → 108 →
  110 → 107 → 104) — yəni **incə pulsasiya/flicker effekti** var (sabit
  deyil, nəfəs alan işıq kimi), bu digər fonlarda müşahidə olunmayan
  unikal xüsusiyyətdir
- **Recreation tövsiyəsi:** İsti narıncı-qəhvəyi (`#8A6154` ətrafı)
  radial glow + `opacity`/`brightness` üzərində 3-4 saniyəlik yumşaq
  sinusoidal pulsasiya animasiyası ("nəfəs alan köz" effekti) — 404
  rəqəmləri/ikonu ön planda sərt-küncli, glow effektsiz qalmalıdır

### 6.5 Admin Panel

**Desktop/Böyük Tablet — `admin_sehifesi_boyuk_tablet_ve_yuxari_ekran_ucun.webp`**
(Statik şəkil — birbaşa fayl kimi verilə bilər, aşağıdakı struktur
təsviri əlavə kontekst üçündür)

- Tünd/qara fon üzərində qurulmuş dashboard
- Sol/yuxarı naviqasiya sahəsi + əsas məzmun sahəsi struktur olaraq
  sərt-küncli kartlar və cədvəllərdən ibarətdir
- Qırmızı aksent rəng aktiv vəziyyət/əsas fəaliyyət elementlərində
  istifadə olunub

**Mobil — `admin_sehifesi_mobil_ucun.mov`**

- **Ölçü:** 720×1280, 18 saniyə
- **Fərq:** Bu fayl digərlərindən fərqli olaraq atmosferik fon deyil,
  **faktiki admin UI-nin mobil ekranda necə davrandığının demo
  çəkilişidir** — ortalama rəng neytral tünd-boz (`71,71,72`) və 5
  kadr ərzində tamamilə sabitdir (fərq yoxdur), bu da ekranın statik
  UI elementlərindən (kartlar, siyahılar, mətn) ibarət olduğunu,
  atmosferik hərəkətli fon olmadığını göstərir
- **Nə göstərir:** Mobil admin dashboard-un naviqasiya/scroll
  davranışı — bölmələr arası keçid, kartların/cədvəllərin mobil
  düzülüşü. Bu, "arxa plan animasiyası" deyil, **funksional UI demo**
  kimi qəbul edilməlidir
- **Recreation tövsiyəsi:** Claude Design bu faylı hərəkətli atmosferik
  fon kimi yox, mobil admin dashboard-un **interaktiv mockup**-u kimi
  tərcümə etməlidir (sidebar/menyu açılması, statistika kartları,
  cədvəl siyahısı, aşağı sərt-küncli, qara fon + qırmızı aksent)

### 6.6 Ümumi Texniki Qeydlər (bütün atmosferik fonlar üçün)

- Bütün 4 atmosferik video (login, profil ×2, search, 404) ortaq
  xüsusiyyət paylaşır: **çox yavaş hərəkət, aşağı-orta parlaqlıq,
  mərkəzi/əsas kontent üçün qəsdən boş buraxılmış sahə**
- Production-da bu videolar admin tərəfindən yüklənəcək və
  ADMIN-03 (format-doğrulama skripti) vasitəsilə optimallaşdırılacaq
  (H.264/WebM, aşağı bitrate, `muted`, `loop`, `playsinline`,
  performans üçün maks. fayl ölçüsü limiti)
- Claude Design mockup mərhələsində real video fayl əvəzinə yuxarıda
  təsvir olunan rəng/hərəkət xüsusiyyətlərinə uyğun **CSS/SVG/Canvas
  əsaslı animasiya** və ya statik poster-kadr + incə hərəkət effekti
  istifadə edə bilər

## 7. Əlavə Mövzu Referansı (Mood/Palette)

Söhbətdə əlavə olaraq bir anime xarakteri illüstrasiyası (tünd,
buludlu/dumanlı fon, soyuq mavi-boz tonlar, isti qırmızı aksent —
şərf) paylaşılıb. Bu görüntü müəllif hüququ ilə qorunan hazır sənət
əsəri olduğu üçün **birbaşa məhsulda istifadə edilməməli və
reproduksiya olunmamalıdır** — burada yalnız **əhval-ruhiyyə/palitra
referansı** kimi qeyd olunur: tünd, atmosferik, soyuq mavi-boz fon +
tək isti qırmızı fokus nöqtəsi kombinasiyası artıq bölmə 1 və 6-da
təsvir olunan brend palitrası (qara fon, mavi-bənövşəyi + qırmızı
aksent) ilə tam uyğundur. Əgər layihə üçün orijinal maskot/illüstrasiya
lazımdırsa, bu əhval-ruhiyyəni əsas alan **orijinal** illüstrasiya
sifariş edilməlidir.
