# Hermes PM2 Web UI

PM2 süreç yöneticisi için modern ve kullanıcı dostu web arayüzü.

**Geliştirici:** A. Kerem Gök

## 🚀 Özellikler

- 💻 PM2 süreçlerini görüntüleme ve yönetme
- 📊 Gerçek zamanlı süreç durumu ve kaynak kullanımı
- 📝 Canlı log takibi
- 🔍 Süreçleri projelere göre gruplandırma
- 🎯 Süreçleri başlatma, durdurma ve yeniden başlatma
- 📱 Duyarlı tasarım (mobil uyumlu)

## 📋 Gereksinimler

- Node.js (v14 veya üzeri)
- PM2 (global olarak yüklenmiş)
- TypeScript
- Modern bir web tarayıcısı

### Bağımlılıklar
- Express - Web sunucusu
- Socket.IO - Gerçek zamanlı iletişim
- PM2 - Süreç yönetimi
- UUID - Benzersiz tanımlayıcı üretimi
- BCrypt - Parola şifreleme
- JSONWebToken - Kimlik doğrulama token yönetimi
- Express Rate Limit - API hız sınırlama

## 🛠️ Kurulum

1. Repoyu klonlayın:
```bash
git clone https://github.com/hermesthecat/hermes-pm2-web-ui.git
cd hermes-pm2-web-ui
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. TypeScript dosyalarını derleyin:
```bash
npm run build
```

4. Uygulamayı başlatın:
```bash
npm start
```

Uygulama varsayılan olarak `http://localhost:3001` adresinde çalışacaktır.

## ⚙️ Yapılandırma

Aşağıdaki ortam değişkenlerini kullanarak uygulamayı özelleştirebilirsiniz:

- `PORT`: Sunucu port numarası (varsayılan: 3001)
- `SCRIPT_PATH`: PM2 betik dosyalarının bulunduğu dizin

## 📦 Proje Yapısı

```
hermes-pm2-web-ui/
├── src/
│   ├── models/        # Veri modelleri
│   ├── services/      # İş mantığı servisleri
│   ├── app.ts         # Express uygulama ayarları
│   ├── pm2Lib.ts      # PM2 entegrasyonu
│   └── socketIO.ts    # Socket.IO yönetimi
├── public/
│   ├── css/          # Stil dosyaları
│   ├── js/           # İstemci JavaScript
│   └── index.html    # Ana HTML dosyası
└── data/             # Proje verileri
```

## 🔧 API Endpoint'leri

### Kimlik Doğrulama
- `POST /register` - Yeni kullanıcı kaydı
- `POST /login` - Kullanıcı girişi
- `PUT /password` - Parola değiştirme (giriş gerekli)
- `PUT /admin/user/:id/role` - Kullanıcı rolü güncelleme (admin yetkisi gerekli)

### Süreç Yönetimi (Giriş Gerekli)
- `GET /processes` - Tüm süreçleri listeler
- `PUT /processes/:name/:action` - Süreç üzerinde işlem yapar (start/stop/restart)

### Proje Yönetimi
- `GET /projects` - Tüm projeleri listeler (giriş gerekli)
- `GET /projects/:id` - Belirli bir projeyi getirir (giriş gerekli)
- `POST /projects` - Yeni proje oluşturur (admin yetkisi gerekli)
- `PUT /projects/:id` - Projeyi günceller (admin yetkisi gerekli)
- `DELETE /projects/:id` - Projeyi siler (admin yetkisi gerekli)

### Süreç-Proje İlişkileri
- `POST /projects/:id/processes/:processName` - Projeye süreç ekler (admin yetkisi gerekli)
- `DELETE /projects/:id/processes/:processName` - Projeden süreç kaldırır (admin yetkisi gerekli)

### Güvenlik Önlemleri
- Tüm API istekleri için hız sınırlaması uygulanır (100 istek / 15 dakika)
- Kimlik doğrulama istekleri için daha sıkı hız sınırlaması (5 deneme / 15 dakika)
- JWT tabanlı kimlik doğrulama sistemi
- Admin ve normal kullanıcı rolleri

## 🔌 WebSocket Olayları

- `log:out` - Süreç log çıktıları
- `process:event` - Süreç durum değişiklikleri

## 🎨 Özelleştirme

Arayüz tasarımı Bootstrap 5 ve Bootstrap Icons kullanılarak oluşturulmuştur. `public/css/style.css` dosyasını düzenleyerek görünümü özelleştirebilirsiniz.

## 🤝 Katkıda Bulunma

1. Bu repoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: amazing new feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Bir Pull Request oluşturun

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 İletişim

A. Kerem Gök - [GitHub](https://github.com/hermesthecat)

Proje Linki: [https://github.com/hermesthecat/hermes-pm2-web-ui](https://github.com/hermesthecat/hermes-pm2-web-ui) 