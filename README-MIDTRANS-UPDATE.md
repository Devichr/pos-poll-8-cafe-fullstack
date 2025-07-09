# Poll 8 Cafe - Midtrans Payment Integration Update

## 🎉 **Update Terbaru: Integrasi Pembayaran Midtrans**

Proyek ini telah diperbarui dengan integrasi pembayaran Midtrans yang lengkap untuk frontend customer.

---

## 📁 **Struktur Proyek**

```
pos-poll-8-cafe-fullstack/
├── backend/                 # Backend API (Fastify + Prisma)
├── frontend/               # Frontend Admin/Kasir (React)
├── mobile/                 # Mobile App (React Native)
└── customer/               # 🆕 Frontend Customer (React)
```

---

## 🆕 **Fitur Baru - Frontend Customer**

### 🔐 **Sistem Autentikasi**
- Login & Register dengan validasi
- Session management dengan localStorage
- Protected routes untuk keamanan

### 🍕 **Pemesanan Makanan**
- Menu dengan 12 produk dalam 4 kategori
- Search dan filter berdasarkan kategori
- Add to cart dengan quantity dan notes
- Shopping cart dengan localStorage persistence

### 💳 **Pembayaran Midtrans (BARU!)**
- **Pop-up pembayaran Midtrans** yang terintegrasi
- **6+ metode pembayaran** tersedia:
  - Credit Card 💳
  - Bank Transfer 🏦
  - Virtual Account (BCA, BNI, Permata) 🏧
  - Mandiri Bill Payment 📱
  - Dan metode lainnya
- **Database Payment table** untuk tracking pembayaran
- **Webhook notification** untuk update status
- **Real-time payment status** tracking

### 🎱 **Reservasi Billiard**
- Form reservasi dengan date picker
- Pilihan meja billiard (4 meja tersedia)
- Perhitungan harga berdasarkan durasi

### 📱 **Desain Mobile-First**
- Bottom navigation untuk mobile
- Sidebar untuk desktop
- UI responsif menggunakan shadcn/ui
- Bahasa Indonesia konsisten

---

## 🚀 **Cara Menjalankan**

### 1. **Setup Backend**
```bash
cd backend
bun install
bun run prisma:generate
bun run prisma:migrate
bun run prisma:seed
bun run dev
```
Backend akan berjalan di: `http://localhost:5500`

### 2. **Setup Frontend Customer**
```bash
cd customer
pnpm install
pnpm run dev
```
Customer app akan berjalan di: `http://localhost:5174`

### 3. **Setup Frontend Admin (Opsional)**
```bash
cd frontend
npm install
npm run dev
```
Admin app akan berjalan di: `http://localhost:3000`

---

## 🔧 **Konfigurasi Midtrans**

### Environment Variables (.env)
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="poll8cafe-secret-key-2024"
MIDTRANS_SERVER_KEY="your-midtrans-server-key"
MIDTRANS_CLIENT_KEY="your-midtrans-client-key"
```

### Sandbox Testing
- Gunakan **Midtrans Sandbox** untuk testing
- Client key dan server key sudah dikonfigurasi
- Semua transaksi dalam mode testing

---

## 💾 **Database Schema Update**

### Tabel Payment (Baru)
```sql
model Payment {
  id              String   @id @default(cuid())
  orderId         String   @unique
  amount          Float
  status          String   @default("pending")
  paymentMethod   String?
  midtransToken   String?
  midtransOrderId String?
  transactionId   String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  order Order @relation(fields: [orderId], references: [id])
}
```

---

## 🔄 **API Endpoints Baru**

### Payment Routes
- `POST /payment/create` - Membuat payment token
- `POST /payment/notification` - Webhook Midtrans
- `GET /payment/status/:orderId` - Cek status pembayaran
- `GET /payment/history` - Riwayat pembayaran

---

## 🧪 **Testing Flow**

### Customer Journey
1. **Register/Login** di customer app
2. **Browse menu** dan pilih produk
3. **Add to cart** dengan quantity dan notes
4. **Checkout** dan isi nama pelanggan
5. **Klik "Buat Pesanan & Bayar"**
6. **Pop-up Midtrans** akan muncul
7. **Pilih metode pembayaran** (Credit Card, VA, dll)
8. **Simulasi pembayaran** di sandbox
9. **Status update** otomatis via webhook

### Admin Monitoring
- Pesanan customer akan muncul di frontend admin
- Status pembayaran terupdate real-time
- Tracking lengkap di database

---

## 📦 **Teknologi yang Digunakan**

### Backend
- **Fastify** - Web framework
- **Prisma** - ORM database
- **SQLite** - Database (development)
- **Midtrans** - Payment gateway

### Frontend Customer
- **React 18** - UI framework
- **Vite** - Build tool
- **shadcn/ui** - UI components
- **React Router** - Routing
- **Tailwind CSS** - Styling

---

## 🎯 **Fitur Unggulan**

### ✅ **Real-time Integration**
- Customer order → Admin dashboard
- Payment status → Database update
- Webhook → Status notification

### ✅ **Mobile-First Design**
- Responsive di semua device
- Touch-friendly interface
- Fast loading performance

### ✅ **Secure Payment**
- Midtrans PCI DSS compliant
- Encrypted transaction data
- Secure webhook validation

### ✅ **User Experience**
- Intuitive navigation
- Loading states
- Error handling
- Success notifications

---

## 🔗 **Links Penting**

- **Customer App**: http://localhost:5174
- **Admin App**: http://localhost:3000
- **Backend API**: http://localhost:5500
- **Midtrans Dashboard**: https://dashboard.sandbox.midtrans.com

---

## 📞 **Support**

Untuk pertanyaan atau bantuan teknis, silakan hubungi tim development.

**Happy Coding! 🚀**

