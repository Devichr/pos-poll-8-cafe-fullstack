# Poll 8 Cafe - Customer Frontend

Frontend aplikasi customer untuk Poll 8 Cafe dengan fitur pemesanan makanan, reservasi billiard, dan pembayaran.

## 🚀 Fitur Utama

### ✅ Sistem Autentikasi
- Login & Register dengan validasi
- Session management dengan localStorage
- Protected routes untuk halaman yang memerlukan login

### ✅ Pemesanan Makanan
- Katalog menu dengan 4 kategori (Kopi, Makanan, Minuman, Dessert)
- Search dan filter berdasarkan kategori
- Add to cart dengan quantity dan notes
- Checkout dengan nama pelanggan
- Integrasi dengan backend untuk menyimpan pesanan

### ✅ Reservasi Billiard
- Daftar meja billiard yang tersedia
- Booking dengan tanggal dan waktu
- Perhitungan harga berdasarkan durasi
- Status meja real-time

### ✅ Desain Mobile-First
- Responsive layout untuk mobile dan desktop
- Bottom navigation untuk mobile
- Sidebar navigation untuk desktop
- UI components menggunakan shadcn/ui

### ✅ Integrasi Backend
- API service untuk komunikasi dengan backend
- Real-time data dari database SQLite
- Error handling dan loading states

## 📁 Struktur Folder

```
customer/
├── src/
│   ├── components/          # Komponen UI reusable
│   │   ├── ui/             # shadcn/ui components
│   │   ├── Layout.jsx      # Layout utama dengan navigasi
│   │   └── LoadingSpinner.jsx
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.jsx # Context untuk autentikasi
│   │   └── CartContext.jsx # Context untuk keranjang
│   ├── pages/              # Halaman aplikasi
│   │   ├── Home.jsx        # Dashboard utama
│   │   ├── Login.jsx       # Halaman login
│   │   ├── Register.jsx    # Halaman registrasi
│   │   ├── Menu.jsx        # Katalog menu
│   │   ├── Cart.jsx        # Keranjang belanja
│   │   ├── Billiard.jsx    # Reservasi billiard
│   │   └── Profile.jsx     # Profil pengguna
│   ├── services/           # API services
│   │   └── api.js          # Service untuk komunikasi backend
│   └── App.jsx             # Komponen utama dengan routing
├── package.json
└── vite.config.js
```

## 🛠️ Instalasi & Menjalankan

### Prerequisites
- Node.js 20.x atau lebih baru
- pnpm (package manager)

### 1. Install Dependencies
```bash
cd customer
pnpm install
```

### 2. Jalankan Development Server
```bash
pnpm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

### 3. Build untuk Production
```bash
pnpm run build
```

## 🔧 Konfigurasi

### API Endpoint
Backend API berjalan di `http://localhost:5500`. Jika backend berjalan di port lain, update file `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:5500';
```

### Environment Variables
Tidak ada environment variables khusus yang diperlukan untuk frontend customer.

## 📱 Penggunaan

### 1. Registrasi/Login
- Buka aplikasi di browser
- Klik "Daftar sekarang" untuk membuat akun baru
- Atau login dengan akun yang sudah ada

### 2. Memesan Makanan
- Pilih menu "Menu" dari navigasi
- Browse kategori atau gunakan search
- Klik "Tambah ke Keranjang" pada item yang diinginkan
- Atur quantity dan tambahkan notes jika perlu
- Buka "Keranjang" untuk review dan checkout
- Masukkan nama pelanggan dan klik "Buat Pesanan"

### 3. Reservasi Billiard
- Pilih menu "Billiard" dari navigasi
- Pilih meja yang tersedia
- Tentukan tanggal dan waktu booking
- Konfirmasi reservasi

### 4. Profil
- Akses menu "Profil" untuk melihat informasi akun
- Lihat riwayat pesanan dan reservasi

## 🔗 Integrasi dengan Backend

Customer frontend terintegrasi penuh dengan backend existing:

### API Endpoints yang Digunakan:
- `POST /auth/register` - Registrasi user baru
- `POST /auth/login` - Login user
- `GET /categories` - Ambil kategori menu
- `GET /products` - Ambil daftar produk
- `POST /orders` - Buat pesanan baru
- `GET /api/pool-tables` - Ambil daftar meja billiard
- `PUT /api/create-booking` - Buat reservasi billiard

### Data Flow:
1. Customer melakukan aksi di frontend
2. Frontend mengirim request ke backend API
3. Backend memproses dan menyimpan ke database
4. Response dikembalikan ke frontend
5. UI diupdate sesuai response

## 🎨 UI/UX Features

### Mobile-First Design
- Bottom navigation bar untuk akses cepat
- Touch-friendly buttons dan forms
- Responsive grid layout
- Optimized untuk layar kecil

### Desktop Experience
- Sidebar navigation
- Larger content area
- Hover effects
- Keyboard shortcuts support

### Accessibility
- Semantic HTML structure
- ARIA labels untuk screen readers
- Keyboard navigation support
- High contrast colors

## 🔄 State Management

### AuthContext
Mengelola state autentikasi user:
- Login/logout functionality
- User session persistence
- Protected route handling

### CartContext
Mengelola state keranjang belanja:
- Add/remove items
- Update quantities
- Calculate totals
- Persist cart data

## 🚀 Deployment

### Development
```bash
pnpm run dev --host --port 5174
```

### Production Build
```bash
pnpm run build
pnpm run preview
```

### Docker (Optional)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install
COPY . .
RUN pnpm run build
EXPOSE 5173
CMD ["pnpm", "run", "preview", "--host"]
```

## 📝 Notes

- Frontend customer adalah tambahan dari project existing
- Menggunakan backend yang sama dengan frontend admin/kasir
- Database SQLite sudah di-seed dengan sample data
- Semua aktivitas customer akan terlihat di frontend admin/kasir
- Desain mengikuti bahasa Indonesia sesuai dengan frontend existing

## 🤝 Kontribusi

Untuk menambahkan fitur baru atau memperbaiki bug:

1. Fork repository
2. Buat branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 License

Project ini menggunakan lisensi yang sama dengan project utama Poll 8 Cafe.

