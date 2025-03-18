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

### Süreç Yönetimi
- `GET /processes` - Tüm süreçleri listeler
- `PUT /processes/:name/:action` - Süreç üzerinde işlem yapar (start/stop/restart)

### Proje Yönetimi
- `GET /projects` - Tüm projeleri listeler
- `GET /projects/:id` - Belirli bir projeyi getirir
- `POST /projects` - Yeni proje oluşturur
- `PUT /projects/:id` - Projeyi günceller
- `DELETE /projects/:id` - Projeyi siler

### Süreç-Proje İlişkileri
- `POST /projects/:id/processes/:processName` - Projeye süreç ekler
- `DELETE /projects/:id/processes/:processName` - Projeden süreç kaldırır

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