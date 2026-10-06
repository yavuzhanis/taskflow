# TaskFlow

Tam özellikli, çok kullanıcılı görev yönetimi uygulaması.

## Özellikler

- Clerk ile kayıt, giriş, güvenli oturum ve e-posta koduyla şifre sıfırlama
- Her kullanıcı için izole Task / Project / Tag / Subtask / Comment verisi
- Liste ve sürükle-bırak Kanban görünümü
- Hızlı görev ekleme (`Cmd/Ctrl + K` ve Enter)
- Markdown görev açıklamaları
- Alt görevler ve yorumlar
- Düşük / Normal / Yüksek / Kritik öncelik
- Projeler, etiketler ve son tarihler
- Bugün / Bu hafta / Geciken akıllı filtreleri
- Dashboard günlük tamamlanma oranı ve yaklaşan son tarihler
- Manuel ve otomatik arşiv
- Global arama
- Koyu / açık / sistem teması
- Profil, avatar ve şifre yönetimi
- JSON / CSV veri dışa aktarımı
- Responsive mobil arayüz
- Vercel + Supabase PostgreSQL için hazır yapı

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
3. `.env.local` içindeki dört Clerk değişkenini, `DATABASE_URL` ve `DIRECT_URL` değerlerini Vercel Environment Variables alanına ekle.
4. Deploy et.

Build komutu `prisma generate && next build` olarak hazırdır.

## Güvenlik notu

Kullanıcıya ait modeller `userId` içerir. API'deki tüm okuma/yazma işlemleri aktif Clerk oturumunun `userId` değeriyle filtrelenir. Client'tan gönderilen bir `userId` hiçbir zaman güven kaynağı olarak kullanılmaz.
