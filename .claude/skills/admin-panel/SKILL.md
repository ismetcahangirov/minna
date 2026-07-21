---
name: admin-panel
description: Use when admin panel funksionallığı yazarkən — reklam idarəetməsi, arxa plan video idarəetməsi və format-doğrulama, bloq CRUD, istifadəçi idarəetməsi, rol-əsaslı giriş (RBAC) işlərində.
---

# Admin Panel

## Əsas Prinsip

Tam funksional, rol-əsaslı qorunan dashboard. Qara fon, sərt-künclü kartlar/cədvəllər, qırmızı aksent. Desktop dizayn referansı: `admin_sehifesi_boyuk_tablet_ve_yuxari_ekran_ucun.webp`; mobil davranış: `DESIGN-SPEC.md` bölmə 6.5.

## Modullar

| Modul                       | Funksiya                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| Auth (ADMIN-01)             | Rol-əsaslı giriş nəzarəti — yalnız admin rolu daxil ola bilər                              |
| Reklamlar (ADMIN-02)        | Əlavə et/sil/redaktə; reklam müddəti + skip vaxtı (default 5s) təyini                      |
| Video validasiya (ADMIN-03) | Yüklənən fon videosu avtomatik yoxlanır: ölçü, kodek (H.264/WebM), sıxılma, bitrate limiti |
| Fon videoları (ADMIN-04)    | Hər səhifə üçün fon idarəsi: login, profil (mobil/tablet ayrı), search, 404, admin         |
| Bloqlar (ADMIN-05)          | Yarat / redaktə et / sil                                                                   |
| İstifadəçilər (ADMIN-06)    | Siyahı, blokla, sil                                                                        |

## Kritik Qaydalar

1. **Default fon videoları HEÇ VAXT silinmir** — admin öz videosunu əlavə etməyibsə default göstərilir; admin videosu silinərsə default-a qayıdır (fallback zənciri).
2. Video yükləmə axını: upload → ADMIN-03 format-doğrulama → optimallaşdırma → aktivləşdirmə. Doğrulamadan keçməyən video aktivləşə bilməz.
3. Reklam müddəti/skip vaxtı DB-də saxlanılır — player bu dəyərləri oxuyur (bax `video-player-ads` skill).
4. Bütün admin API endpoint-ləri server tərəfdə rol yoxlamasından keçir — yalnız client-side qoruma KİFAYƏT DEYİL.
5. İstifadəçi blocklama Google OAuth login axınında yoxlanılır — bloklu istifadəçi sessiya aça bilməz.

## Dizayn

- Data cədvəlləri: sərt künclü, yüksək kontrast, qara fon + qırmızı aksent (aktiv vəziyyət/əsas fəaliyyət).
- Mobil: sidebar/menyu açılması, statistika kartları, cədvəl siyahısı — `admin_sehifesi_mobil_ucun.mov` funksional UI demo-dur, atmosferik fon deyil.
- Admin panelin öz arxa plan videosu da var (default, admin dəyişə bilər) — ADMIN-07.

## Tez-tez edilən səhvlər

| Səhv                                                      | Düzəliş                                           |
| --------------------------------------------------------- | ------------------------------------------------- |
| Yalnız middleware/client-də admin yoxlaması               | Hər API route-da server-side rol yoxlaması        |
| Default videonu üzərinə yazmaq (overwrite)                | Default toxunulmazdır — yalnız prioritet dəyişir  |
| Format-doğrulamadan yan keçib videonu birbaşa aktiv etmək | Doğrulama məcburi addımdır (performans qorunması) |
