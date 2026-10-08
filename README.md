# TaskFlow

Tam özellikli, çok kullanıcılı görev yönetimi uygulaması.

## Özellikler

- **Güçlü Kimlik Doğrulama:** Clerk ile kayıt, giriş, güvenli oturum ve e-posta koduyla şifre sıfırlama
- **Çok Kiracılı Güvenlik (Multi-tenant Isolation):** Her kullanıcı için izole Task / Project / Tag / Subtask / Comment verisi ve otomatik test scripti (`npm run test:tenant-schema`)
- **Süper Yönetici Konsolu (`/admin`):** Rol bazlı yetkilendirme (USER / ADMIN), kullanıcı yönetimi, canlı Supabase latency/sağlık monitörü, sistem duyuruları banner yönetimi ve küresel arşivleme
- **Zengin Bildirim Sistemi:** Uygulama içi bildirim zili, son tarih alarmları, tarayıcı Masaüstü Bildirimleri (Desktop Notifications)
- **Web Audio API Ses Efektleri:** Görev tamamlama, silme ve aksiyonlar için ayarlanabilir tatmin edici ses geribildirimleri
- **Görünüm Seçenekleri:** Liste ve sürükle-bırak Kanban panosu
- **Hızlı Görev Ekleme:** `Cmd/Ctrl + K` global arama ve `N`/`C` klavye kısayolları
- **Görev Detayı:** Markdown açıklamaları, alt görevler (subtasks) ve zaman damgalı yorumlar
- **Öncelik & Filtreleme:** Düşük / Normal / Yüksek / Kritik öncelik; Bugün / Bu hafta / Geciken akıllı filtreleri
- **Dashboard & Analitik:** Günlük tamamlanma oranı grafikleri, yaklaşan son tarihler ve aktivite akışı
- **Otomatik Arşivleme:** Belirli günden eski tamamlanan görevleri otomatik veya manuel arşivleme
- **Tema Desteği:** Kusursuz Koyu (Dark), Açık (Light) ve Sistem temaları
- **Veri Dışa Aktarımı:** JSON ve CSV formatlarında anında dışa aktarma (Export)
- **Vercel & Supabase Uyumlu:** Next.js 16 Turbopack ve Prisma 7 ile sıfır konfigürasyon deploy hazır


## Gereksinimler

- Node.js 20.19+ (Node 22 önerilir)
- Bir Clerk uygulaması
- Bir Supabase projesi

## 1. Kurulum

```bash
npm install
```

## 2. Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyala:

```bash
cp .env.example .env.local
```

### Clerk

Clerk Dashboard'dan Publishable Key ve Secret Key değerlerini `.env.local` içine koy.

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

Clerk'te Email + Password giriş yöntemini etkinleştir. Şifre sıfırlama e-posta kodu üzerinden çalışır.

### Supabase

Supabase > Project Settings > Database bağlantı bilgilerini kullan:

```env
DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...:5432/postgres"
```

`DATABASE_URL` çalışan uygulama için pooler bağlantısı, `DIRECT_URL` Prisma şema komutları içindir.

## 3. Veritabanını oluştur

```bash
npm run setup
```

## 4. Çalıştır

```bash
npm run dev
```

Tarayıcı:

- `http://localhost:3000`
- `http://localhost:3000/signup`
- `http://localhost:3000/login`
- `http://localhost:3000/dashboard`

Veritabanı kontrolü:

- `http://localhost:3000/api/health/database`

## Vercel

1. Projeyi GitHub'a gönder.
2. Vercel'de repository'yi import et.
3. `.env.local` içindeki Clerk değişkenlerini, `DATABASE_URL`, `DIRECT_URL`, `ADMIN_EMAILS` ve `CRON_SECRET` değerlerini Vercel Environment Variables alanına ekle.
4. Deploy et.

`vercel.json` Vercel build komutunu `npm run vercel-build` olarak sabitler. Bu komut sırasıyla Prisma şemasını doğrular, tenant izolasyon testini çalıştırır, Prisma Client üretir, production migration'ları `prisma migrate deploy` ile uygular ve Next.js production build'i `next build --webpack` ile alır.

Vercel Cron her gün `03:00 UTC` saatinde `/api/cron/archive` endpoint'ini tetikler. Bu, Türkiye saatiyle `06:00` civarında otomatik arşivlemeyi çalıştırır. Endpoint `Authorization: Bearer $CRON_SECRET` kontrolü yaptığı için Vercel Production ortamında uzun ve rastgele bir `CRON_SECRET` tanımlı olmalıdır.

Yerelde production build kontrolü:

```bash
npm run build
```

## Güvenlik notu

Kullanıcıya ait modeller `userId` içerir. API'deki tüm okuma/yazma işlemleri aktif Clerk oturumunun `userId` değeriyle filtrelenir. Client'tan gönderilen bir `userId` hiçbir zaman güven kaynağı olarak kullanılmaz.
