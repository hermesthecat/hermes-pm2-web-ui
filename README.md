# Hermes PM2 Web UI

**Hermes PM2 Web UI**, [PM2](https://pm2.keymetrics.io/) süreç yöneticisi altında çalışan Node.js uygulamalarınızı yönetmek için tasarlanmış modern, duyarlı ve kullanıcı dostu bir web arayüzüdür.

![Uygulama Ekran Görüntüsü](https://via.placeholder.com/800x400.png?text=Hermes+UI+Screenshot)

## ✨ Temel Özellikler

- **Süreç Yönetimi**: PM2 tarafından yönetilen tüm süreçlerinizi listeleyin. Durumlarını (çalışıyor, durduruldu, hatalı vb.), çalışma sürelerini ve kaynak kullanımlarını (CPU, bellek) anında görün.
- **Proje Tabanlı Organizasyon**: İlgili PM2 süreçlerini "Projeler" altında mantıksal olarak gruplayın. Bu, mikroservis mimarileri veya çok bileşenli uygulamalar için mükemmel bir organizasyon sağlar.
- **Gerçek Zamanlı Log Akışı**: WebSockets aracılığıyla süreçlerinizin `stdout`, `stderr` ve durum olaylarını (`start`, `stop`) doğrudan tarayıcınızdaki konsolda canlı olarak izleyin. Tek bir sürecin, bütün bir projenin veya tüm süreçlerin loglarını filtreleyebilirsiniz.
- **Tek Tıkla Kontrol**: Süreçleri web arayüzünden kolayca başlatın, durdurun veya yeniden başlatın.
- **Dinamik Arayüz**: Sayfayı yeniden yüklemeye gerek kalmadan tüm işlemleri gerçekleştiren, duyarlı ve tek sayfalık bir uygulama (SPA).

## 🛠️ Teknoloji Yığını

- **Backend**: Node.js, Express, TypeScript
- **Gerçek Zamanlı İletişim**: Socket.IO
- **Süreç Yönetimi**: PM2 API
- **Frontend**: HTML5, Bootstrap 5, jQuery
- **Veri Saklama**: JSON (Projeler için)

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler

- Node.js (v14 veya üstü)
- npm
- PM2'nin global olarak kurulu olması: `npm install pm2 -g`

### Kurulum

1. Proje reposunu klonlayın:

   ```bash
   git clone https://github.com/hermesthecat/hermes-pm2-web-ui.git
   cd hermes-pm2-web-ui
   ```

2. Gerekli bağımlılıkları yükleyin:

   ```bash
   npm install
   ```

### Geliştirme Ortamı

Geliştirme sunucusunu `ts-node` ile başlatmak için aşağıdaki komutu çalıştırın. Bu komut, kodda yapılan değişiklikleri otomatik olarak algılar ve sunucuyu yeniden başlatır.

```bash
npm run dev
```

### Üretim Ortamı

Uygulamayı üretim ortamında çalıştırmak için önce TypeScript kodunu JavaScript'e derleyin ve ardından sunucuyu başlatın:

```bash
# 1. Adım: TypeScript projesini derle
npm run build

# 2. Adım: Uygulamayı başlat (PM2 ile başlatılması önerilir)
npm start 
# veya
pm2 start dist/app.js --name hermes-ui
```

Uygulama varsayılan olarak `http://localhost:3001` adresinde çalışacaktır.

## ⚙️ Yapılandırma

Uygulamayı başlatırken ortam değişkenleri (`environment variables`) kullanarak yapılandırabilirsiniz. Proje kök dizinine bir `.env` dosyası oluşturabilir veya bu değişkenleri doğrudan başlangıç komutunuza ekleyebilirsiniz.

- `PORT`: Sunucunun çalışacağı port numarası. (Varsayılan: `3001`)
- `SCRIPT_PATH`: PM2 tarafından henüz yönetilmeyen betiklerin bulunduğu dizinin mutlak veya göreceli yolu. `pm2Lib` bu yola bakarak yeni süreçleri başlatmak için gerekli yapılandırmayı oluşturur.

## 🗂️ Proje Yapısı

```bash
hermes-pm2-web-ui/
├── data/               # Proje tanımlarını içeren `projects.json` dosyası burada saklanır.
├── public/             # İstemci tarafı dosyaları (HTML, CSS, JS).
│   ├── css/
│   ├── js/
│   └── index.html
├── src/                # Sunucu tarafı TypeScript kaynak kodu.
│   ├── models/         # Proje veri modeli (Project.ts).
│   ├── services/       # İş mantığı katmanı (ProjectService.ts).
│   ├── app.ts          # Express sunucusu, API endpoint'leri ve Socket.IO kurulumu.
│   ├── pm2Lib.ts       # PM2 API ile etkileşim kuran sarmalayıcı (wrapper).
│   └── socketIO.ts     # (Bu dosya app.ts'e entegre edilmiştir)
├── package.json
└── tsconfig.json
```

## 🔌 API Uç Noktaları (Endpoints)

Uygulama, ön yüz ile iletişim kurmak için bir RESTful API sunar.

### Süreç Yönetimi

- `GET /processes`: PM2 tarafından yönetilen tüm süreçlerin detaylı listesini döndürür.
- `PUT /processes/:name/:action`: Belirtilen süreç (`:name`) üzerinde bir eylem (`:action` -> `start`, `stop`, `restart`) gerçekleştirir.

### Proje Yönetimi

- `GET /projects`: `data/projects.json` içinde tanımlı tüm projeleri listeler.
- `POST /projects`: Yeni bir proje oluşturur.
- `GET /projects/:id`: Belirtilen ID'ye sahip projeyi döndürür.
- `PUT /projects/:id`: Belirtilen projeyi günceller.
- `DELETE /projects/:id`: Belirtilen projeyi siler.

### Proje-Süreç İlişkileri

- `POST /projects/:id/processes/:processName`: Bir PM2 sürecini bir projeye bağlar.
- `DELETE /projects/:id/processes/:processName`: Bir PM2 sürecinin bir projeyle olan bağını kaldırır.

## 🤝 Katkıda Bulunma

Katkılarınız projeyi daha iyi hale getirmemize yardımcı olur! Lütfen standart GitHub fork & pull request akışını takip edin.

1. Bu repoyu fork'layın.
2. Yeni bir özellik dalı oluşturun (`git checkout -b feature/YeniHarikaOzellik`).
3. Değişikliklerinizi commit'leyin (`git commit -m 'feat: Yeni harika bir özellik eklendi'`).
4. Dalınızı push'layın (`git push origin feature/YeniHarikaOzellik`).
5. Bir Pull Request açın.

## 📝 Lisans

Bu proje MIT Lisansı altında dağıtılmaktadır. Daha fazla bilgi için `LICENSE` dosyasına bakınız.

## 📞 İletişim

A. Kerem Gök - [GitHub](https://github.com/hermesthecat)

Proje Linki: [https://github.com/hermesthecat/hermes-pm2-web-ui](https://github.com/hermesthecat/hermes-pm2-web-ui)
