# ChatGPT ilə Şəkil Generasiyası (brauzerdən)

Şəkil generasiyası **chatgpt.com saytında, istifadəçinin öz hesabında** aparılır. Codex CLI-də şəkil aləti yoxdur; higgsfield kredit tələb edir. Bu yol istifadəçinin artıq ödədiyi hesabdan istifadə edir.

## Dəyişməz Qayda: Bir Söhbətdə Maksimum 3 Şəkil

> **Bir söhbətdə 3 şəkildən çox generasiya etmə. 3-cüdən sonra YENİ söhbət aç.**

Səbəbi: uzun söhbətdə model əvvəlki şəkillərin üslubunu daşıyır, məhdudiyyətlər sürüşür və 5-ci şəkil 1-cinin donuq təkrarına çevrilir. Həm də uzun söhbətlər generasiya limitini daha tez tükədir.

**Sayğacı özün saxla.** Hər generasiyadan sonra sayı yaz:

```
Söhbət 1: [1/3] cover · [2/3] bölmə ayırıcısı · [3/3] bağlanış → DOLDU
Söhbət 2: [1/3] ...
```

Yeni söhbət açmaq (yoxlanılıb — sidebar-dakı "New chat" linkinin `href`-i `/`-dir):

```
browser_navigate → https://chatgpt.com/
```

Klikləməyə ehtiyac yoxdur. Səhifə boş composer ilə açılır.

## 1. Giriş Əl Sıxma

```
browser_navigate → https://chatgpt.com/
browser_snapshot
```

Snapshot-da `button "Log in"` və _"Log in to get answers based on saved chats, plus create images and upload files"_ görürsənsə — **istifadəçi daxil deyil və şəkil generasiya edilə bilməz**.

Bu halda:

- **`Log in` düyməsinə SƏN basma, parol yazma.** Hesab istifadəçinindir.
- De ki: _"chatgpt.com açıqdır, hesabına daxil ol və mənə de."_
- **Dayan və gözlə.** İstifadəçi təsdiq edənə qədər brauzerdə heç bir addım atma — parol səhifəsində klikləmək və ya `evaluate` işlətmək girişi poza bilər.

Daxil olandan sonra snapshot-da composer görünür. Sessiya Playwright profilində qalır.

## 2. Composer-i Tap

Composer **yalnız daxil olandan sonra DOM-da olur** — çıxışda `#prompt-textarea` mövcud deyil. Ona görə selektoru sabit yazma; hər dəfə `browser_snapshot` götür və ref-i oradan al.

Adətən:

- Prompt sahəsi: `#prompt-textarea` (contenteditable, `<textarea>` deyil)
- Göndər: `[data-testid="send-button"]`

Yazmaq üçün `browser_type` (ref ilə), sonra `browser_press_key` → `Enter`.

Generasiya 15–60 saniyə çəkir. `browser_wait_for` ilə şəklin görünməsini gözlə, `browser_snapshot` ilə təsdiqlə. Tələsib snapshot götürsən boş mesaj görəcəksən.

## 3. Prompt Qaydaları

Layihənin "uydurma personaj olmasın" qaydası burada **daha da sərtdir**, çünki model istənilən şeyi çəkməyə hazırdır.

### İcazəli mövzular

| Mövzu               | Nümunə                                                |
| ------------------- | ----------------------------------------------------- |
| Abstrakt atmosfer   | duman, neon işıq, gecə şəhəri siluet, yağış, tekstura |
| Konseptual metafora | boş kinoteatr kreslosu, dayanmış saat, açıq pəncərə   |
| Fon / ayırıcı       | qaranlıq qradient səth, film dənəsi, işıq sızması     |
| Obyekt natürmortu   | köhnə televizor, DVD yığını, qulaqlıq — insansız      |

### Qadağan

| Qadağa                                                | Səbəb                                                |
| ----------------------------------------------------- | ---------------------------------------------------- |
| Anime personajı (adı çəkilən və ya "anime qız/oğlan") | Mövcud olmayan personaj uydurulur — faktiki səhv     |
| İnsan sifəti                                          | Barmaq/göz/sifət məntiq xətaları ən çox burada çıxır |
| Şəkil üzərində mətn, logo, başlıq                     | Model hərfləri korlayır. Mətn HTML/CSS ilə yazılır.  |
| Konkret animenin səhnəsinin "yenidən çəkilməsi"       | Rəsmi artwork var — onu istifadə et                  |

### Prompt şablonu

Hər promptun sonuna bu bəndi əlavə et:

```
Style: cinematic, dark, high contrast, pure black background, deep shadows,
single red accent light (#E50914). 16:9 wide composition. Photographic, not
illustrated. No characters, no people, no faces, no text, no letters, no logos,
no watermarks.
```

Tam nümunə:

```
A single empty cinema seat in a pitch-black room, one narrow red light falling
across the armrest, dust visible in the beam. Shot from a low angle, wide.

Style: cinematic, dark, high contrast, pure black background, deep shadows,
single red accent light (#E50914). 16:9 wide composition. Photographic, not
illustrated. No characters, no people, no faces, no text, no letters, no logos,
no watermarks.
```

Ölçü istəyəndə **16:9 wide** de — post cover-i və sosial kart bu nisbətdə kəsilir.

## 4. Şəkli Çıxar

Generasiyadan sonra şəklin `src`-ini götür:

```
browser_evaluate → () => [...document.querySelectorAll('main img')]
    .map(i => ({ src: i.src, w: i.naturalWidth, h: i.naturalHeight }))
    .filter(i => i.w > 400)
```

Sonra **birinci yolu sına**, alınmasa ikinciyə keç:

### Yol A — URL-i birbaşa imgbb-yə ver (ən təmiz)

ChatGPT şəkilləri imzalanmış (signed) blob URL-ləri ilə verilir, yəni imgbb serveri onları özü çəkə bilir:

```bash
node .claude/skills/blog-publishing/scripts/imgbb-upload.mjs \
  "<şəklin src URL-i>" "empty-cinema-seat-red-light"
```

Alınmırsa (imzanın vaxtı bitib və ya 403) — Yol B.

### Yol B — Səhifə kontekstindən oxu

Şəkli səhifənin öz sessiyası ilə çək, base64 kimi qaytar (mexanizm yoxlanılıb — 157 KB JPEG uğurla oxundu):

```
browser_evaluate → async () => {
  const img = [...document.querySelectorAll('main img')]
    .filter(i => i.naturalWidth > 400).pop();
  const r = await fetch(img.src);
  const u = new Uint8Array(await r.arrayBuffer());
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}
```

Qayıdan sətri fayla yaz:

```bash
node .claude/skills/blog-publishing/scripts/save-base64.mjs \
  .playwright-mcp/generated.png < payload.b64
```

Fayl **layihə kökünün içində** olmalıdır (Playwright/`.playwright-mcp` qaydası).

## 5. BAX, sonra yüklə

```
Read .playwright-mcp/generated.png
```

Bu addım buraxıla bilməz. Yoxladıqların:

- Şəkildə **mətn/hərf yoxdur** (model gizli şəkildə yazı əlavə edir)
- Sifət, əl, barmaq yoxdur — varsa şəkli **at**, düzəltməyə çalışma
- Perspektiv və işıq məntiqlidir (kölgə işıq mənbəyi ilə uyğundur)
- Fon həqiqətən qaradır, boz-qəhvəyi deyil
- Şəkil məqalənin həmin bölməsi ilə əlaqəlidir

Uyğun deyilsə: **eyni söhbətdə düzəliş istə** (bu, sayğacda yeni şəkil sayılır) və ya sayğac dolubsa yeni söhbətdə yenidən yaz.

Sonra imgbb-yə yüklə və `i.ibb.co` URL-ini posta qoy.

## Hansı Şəkil Haradan — Qərar Cədvəli

| Şəkil nə göstərməlidir               | Mənbə                                               |
| ------------------------------------ | --------------------------------------------------- |
| Konkret anime, personaj, səhnə       | **AniList rəsmi artwork** — ChatGPT YOX             |
| Top 10 cover, siyahı kartı, müqayisə | **HTML kompozisiya** (`assets/cover-template.html`) |
| Atmosfer, metafora, bölmə ayırıcısı  | **ChatGPT** (bu sənəd)                              |
| Studiya elanı, press şəkli           | Rəsmi mənbə, brauzerdən                             |

Ən çox rast gəlinən səhv: Top 10 postunda animelərin şəkillərini ChatGPT-yə çəkdirmək. Nəticə — heç bir animeyə aid olmayan on şəkil. Rəsmi cover-lər pulsuz, dəqiq və artıq mövcuddur.

## Sürətli Yoxlama Siyahısı

- [ ] İstifadəçi chatgpt.com-a daxil olub (sən yox)
- [ ] Bu söhbətdə hələ 3 şəkil generasiya olunmayıb
- [ ] Prompt-da "no characters, no faces, no text" bəndi var
- [ ] Şəkil generasiyadan sonra `Read` ilə baxılıb
- [ ] Şəkildə mətn və sifət yoxdur
- [ ] imgbb-yə açar söz adı ilə yüklənib
- [ ] 3-cü şəkildən sonra `browser_navigate → https://chatgpt.com/` ilə yeni söhbət açılıb
