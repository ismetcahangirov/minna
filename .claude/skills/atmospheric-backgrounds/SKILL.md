---
name: atmospheric-backgrounds
description: Use when login, profil, axtarış (search), 404 və ya admin səhifələrinin arxa plan video/animasiyaları üzərində işləyərkən — fon videosu, background animation, CSS/SVG recreation, video optimizasiyası mövzularında.
---

# Atmosferik Arxa Plan Videoları

## Əsas Prinsip

4 səhifədə (login, profil, search, 404) default atmosferik fon videosu var. Bunlar UI qadağalarından (gradient yox) **istisnadır** — video/fotoqrafik təbiətli qatda glow/duman normaldır. Dəqiq vizual analiz: `DESIGN-SPEC.md` bölmə 6.

## Tez İstinad

| Səhifə | Ref fayl | Palitra (orta RGB) | Hərəkət |
|---|---|---|---|
| Login | `login_sehifesi___tablet_ve_yuxari_olculer_ucun.mov` | Soyuq mavi-boz `(80,99,115)` | Çox yavaş dreamy sürüşmə, davamlı loop |
| Profil (mobil) | `profil_sehifesi_mobil_ucun.mov` | İsti qəhvəyi-boz `(64,59,60)` | Qaradan fade-in + yavaş duman |
| Profil (tablet/web) | `profil_sehifesi_tablet_ve_web_ucun.mov` | Boz-yaşılımtıl `(60,62,59)` | Sabit atmosferik loop |
| Search | `search_page.mov` | Teal/firuzəyi `(60,120,103)` | Sakit glow-pulse |
| 404 | `404_sehifesi_.mov` | İsti narıncı-qəhvəyi `(138,97,84)` | İncə pulsasiya/flicker ("nəfəs alan köz") |
| Admin (mobil) | `admin_sehifesi_mobil_ucun.mov` | **Fon deyil** — funksional UI demo | Statik UI, interaktiv mockup kimi qəbul et |

## Qaydalar

1. **Default videolar heç vaxt silinmir** — admin öz videosunu əlavə etməyibsə default göstərilir (ADMIN-04).
2. Ortaq kompozisiya: çox yavaş hərəkət, aşağı-orta parlaqlıq, **mərkəzi kontent üçün qəsdən boş sahə**.
3. Video atributları məcburidir: `muted`, `loop`, `playsinline`, aşağı bitrate.
4. Admin yüklədiyi video ADMIN-03 format-doğrulama skriptindən keçir (H.264/WebM, sıxılma, ölçü limiti).
5. Login mobil: ayrıca mobil video yoxdursa, tablet videosu responsive crop/`object-fit` ilə istifadə olunur.

## Recreation (real video hazır olmayanda)

Mockup mərhələsində CSS/SVG/Canvas ilə bərpa et:

- **Login:** `#4F6373` ətrafı radial glow + noise/fog SVG filter, 8-15s yavaş translate/opacity loop
- **Profil:** tünd qəhvəyi-boz zəmin + aşağı-opacity smoke/ash hissəcik qatı; mobildə 1-2s qara fade-in giriş
- **Search:** teal əsaslı "nəfəs alan" radial glow, 6-10s dövr
- **404:** `#8A6154` radial glow + 3-4s sinusoidal brightness pulsasiyası; 404 rəqəmləri ön planda sərt-künclü, glow-suz

## Tez-tez edilən səhvlər

| Səhv | Düzəliş |
|---|---|
| Fon videosuna görə UI-da da gradient işlətmək | İstisna yalnız video qatına aiddir — UI komponentləri düz rəng |
| Admin mobil `.mov`-u atmosferik fon kimi tətbiq etmək | O, UI davranış demo-sudur — dashboard mockup kimi oxu |
| Default videonu admin yükləməsi ilə əvəz edib silmək | Default DB/storage-da qalır, yalnız görünüş prioriteti dəyişir |
