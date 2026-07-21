---
name: video-player-ads
description: Use when bölüm izləmə səhifəsi, custom video player, pre-roll reklam overlay, skip ad düyməsi, növbəti bölüm keçidi və ya izləmə tarixçəsi (watch progress) üzərində işləyərkən.
---

# Video Player & Pre-roll Reklamlar

## Əsas Prinsip

YouTube tərzində tam funksional custom player. Video başlamazdan əvvəl **admin-idarəli pre-roll reklam** göstərilir — 5 saniyədən sonra keçilə bilər.

## Player Xüsusiyyətləri (PLAYER-01)

Play/pause · progress bar · volume · fullscreen · keyfiyyət seçimi · alt-yazı dəstəyi.
Player kontrolları reklam bitənə/keçilənə qədər **deaktiv** qalır.

## Pre-roll Reklam Spesifikasiyası (PLAYER-02)

1. Reklam video frame ilə **tam eyni ölçüdə**, videonun üzərini tam örtür.
2. Geri sayım: "Reklamı keç: 5s" → "4s" → ... (i18n açarı ilə, hardcode YOX).
3. 5 saniyədən sonra **"Reklamı keç" (Skip Ad)** düyməsi aktivləşir — sağ alt küncdə (YouTube kimi).
4. Skip ediləndə əsas video **avtomatik** başlayır.
5. Reklam 5 saniyədən qısadırsa → bitəndə avtomatik keçid.
6. Reklam müddəti və skip vaxtı admin paneldən gəlir (dəyərləri hardcode ETMƏ) — bax `admin-panel` skill.

## Reklam Datası (PLAYER-03)

Reklam məzmunu backend-dən dinamik çəkilir (admin CRUD ilə idarə olunur). Reklam yoxdursa player birbaşa əsas videoya keçir — boş overlay göstərmə.

## Növbəti Bölüm (PLAYER-04)

- Bölüm bitəndə "next episode" overlay təklifi (YouTube tərzi).
- Manual keçid düyməsi player-də həmişə mövcuddur.

## Watch Progress (PLAYER-05)

- İzləmə mövqeyi login olmuş istifadəçi üçün Neon DB-də saxlanılır.
- Bölüm yenidən açılanda istifadəçi **qaldığı yerdən davam edir**.
- Progress yazma throttle olunmalıdır (hər saniyə DB write YOX — interval/beforeunload).

## Tez-tez edilən səhvlər

| Səhv | Düzəliş |
|---|---|
| Skip vaxtını 5s hardcode etmək | Admin paneldən gələn dəyəri istifadə et (default 5s) |
| Reklam zamanı player kontrollarının aktiv qalması | Reklam bitənə qədər kontrollar kilidli |
| Reklam overlay-in frame-dən fərqli ölçüdə olması | Overlay video konteynerinin ölçüsünə tam bağlanır |
| Watch progress-i hər timeupdate-də DB-yə yazmaq | Throttle + unload zamanı flush |
