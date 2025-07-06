# Hermes PM2 Web UI - Bug Analizi ve Çözüm Önerileri

Bu dokümanda, Hermes PM2 Web UI projesinde tespit edilen potansiyel bug'lar, güvenlik açıkları ve performans sorunları detaylandırılmıştır.

## 🔴 Kritik Seviye Bug'lar

### 1. **PM2 Bus Bağlantı Sızıntısı (Memory Leak)**

**Dosya:** `src/pm2Lib.ts` - Line 54-107  
**Açıklama:** PM2 bus bağlantısı bir kez oluşturulduktan sonra hiçbir zaman kapatılmıyor. Bu durum uzun süre çalışan uygulamalarda memory leak'e neden olabilir.

**Sorun:**

```typescript
async init() {
  if (this.bus) {
    return; // Bus zaten varsa çık, ama hiçbir zaman temizlenmiyor
  }
  this.bus = await promisify<EventEmitter>(pm2.launchBus).call(pm2);
  // ... event listeners ekleniyor ama hiçbir zaman temizlenmiyor
}
```

**Çözüm:**

```typescript
// Cleanup metodu ekle
async cleanup() {
  if (this.bus) {
    this.bus.removeAllListeners();
    // PM2 bus'ı kapat
    pm2.disconnect();
    this.bus = undefined;
  }
}

// Process exit handler ekle
process.on('SIGINT', () => {
  this.cleanup();
  process.exit(0);
});
```

### 2. **Socket.IO Event Listener Memory Leak**

**Dosya:** `src/app.ts` - Line 291-305  
**Açıklama:** Her client bağlantısında yeni bir log handler ekleniyor ama client disconnect olduğunda sadece o handler kaldırılıyor. PM2 event listener'ları temizlenmiyor.

**Sorun:**

```typescript
const logHandler = (log: any) => {
  socket.emit('log:out', log);
};
pm2Lib.on('log', logHandler);
// Disconnect'te sadece bu handler kaldırılıyor
pm2Lib.off('log', logHandler);
```

**Çözüm:**

```typescript
// Client tracking sistemi ekle
const clientHandlers = new Map();

io.on('connection', (socket) => {
  const handlers = {
    log: (log: any) => socket.emit('log:out', log),
    statusChange: (data: any) => socket.emit('status:change', data)
  };
  
  clientHandlers.set(socket.id, handlers);
  
  Object.entries(handlers).forEach(([event, handler]) => {
    pm2Lib.on(event, handler);
  });

  socket.on('disconnect', () => {
    const handlers = clientHandlers.get(socket.id);
    if (handlers) {
      Object.entries(handlers).forEach(([event, handler]) => {
        pm2Lib.off(event, handler);
      });
      clientHandlers.delete(socket.id);
    }
  });
});
```

### 3. **Dosya Yazma Race Condition**

**Dosya:** `src/services/ProjectService.ts` - Line 86-95  
**Açıklama:** Debounced save mekanizması race condition'a açık. Aynı anda birden fazla işlem yapılırsa veri kaybı olabilir.

**Sorun:**

```typescript
private scheduleSave() {
  if (this.saveTimeout) {
    clearTimeout(this.saveTimeout); // Önceki save iptal ediliyor
  }
  this.saveTimeout = setTimeout(() => {
    this.saveToFile(); // Veri kaybı riski
  }, this.SAVE_DELAY);
}
```

**Çözüm:**

```typescript
private saveQueue = Promise.resolve();

private scheduleSave() {
  this.saveQueue = this.saveQueue.then(async () => {
    await new Promise(resolve => setTimeout(resolve, this.SAVE_DELAY));
    return this.saveToFile();
  }).catch(error => {
    console.error('Save error:', error);
  });
}
```

## 🟡 Orta Seviye Bug'lar

### 4. **API Kimlik Doğrulama Bypass**

**Dosya:** `src/app.ts` - Line 34-46  
**Açıklama:** API_KEY yoksa tüm endpoint'ler korumasız kalıyor. Bu production ortamında güvenlik riski oluşturur.

**Sorun:**

```typescript
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!API_KEY) {
    return next(); // Koruma tamamen devre dışı
  }
  // ...
};
```

**Çözüm:**

```typescript
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!API_KEY) {
    console.warn('[SECURITY] API_KEY not set, rejecting request');
    return res.status(401).json({ 
      message: 'API_KEY must be configured for security' 
    });
  }
  // ...
};
```

### 5. **PM2 Process Start Error Handling**

**Dosya:** `src/pm2Lib.ts` - Line 130-155  
**Açıklama:** Process start işleminde hata durumunda partial state kalabilir.

**Sorun:**

```typescript
async startProcess(processNameOrOptions: string | StartOptions): Promise<Proc> {
  try {
    if (typeof processNameOrOptions === 'string') {
      const processName = processNameOrOptions;
      const processes = await this.getProcesses();
      const existingProcess = processes.find(p => p.name === processName);

      if (existingProcess) {
        return await promisify<string, Proc>(pm2.start).call(pm2, processName);
      } else {
        // Yeni process oluşturulurken hata olursa cleanup yok
        const startOptions = this.getStartOptions(processName);
        return await promisify<StartOptions, Proc>(pm2.start).call(pm2, startOptions);
      }
    }
    // ...
  } catch (error) {
    // Hata durumunda cleanup yapılmıyor
    throw error;
  }
}
```

**Çözüm:**

```typescript
async startProcess(processNameOrOptions: string | StartOptions): Promise<Proc> {
  let processName: string;
  try {
    // ... mevcut kod
  } catch (error) {
    // Hata durumunda cleanup yap
    if (processName) {
      try {
        await this.stopProcess(processName);
      } catch (cleanupError) {
        console.warn(`Cleanup failed for ${processName}:`, cleanupError);
      }
    }
    throw error;
  }
}
```

### 6. **Frontend Socket Reconnection Eksikliği**

**Dosya:** `public/js/main.js` - Line 80-94  
**Açıklama:** Socket bağlantısı koptuğunda otomatik yeniden bağlanma mekanizması yok.

**Sorun:**

```javascript
socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err.message);
  if (err.message.includes('Unauthorized')) {
    logout(); // Sadece auth hatası için logout
  }
  // Diğer hatalar için reconnection yok
});
```

**Çözüm:**

```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err.message);
  if (err.message.includes('Unauthorized')) {
    logout();
    return;
  }
  
  reconnectAttempts++;
  if (reconnectAttempts <= maxReconnectAttempts) {
    setTimeout(() => {
      console.log(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
      socket.connect();
    }, 2000 * reconnectAttempts);
  } else {
    showToast('error', 'Connection lost. Please refresh the page.');
  }
});

socket.on('connect', () => {
  reconnectAttempts = 0; // Reset counter on successful connection
});
```

## 🟢 Düşük Seviye Bug'lar ve İyileştirmeler

### 7. **JSON Parse Error Handling**

**Dosya:** `src/services/ProjectService.ts` - Line 52-58  
**Açıklama:** JSON parse hatası durumunda hata mesajı belirsiz.

**Çözüm:**

```typescript
try {
  const data = await fs.readFile(this.dataFile, 'utf-8');
  const projects = JSON.parse(data) as Project[];
  this.projects = new Map(projects.map(p => [p.id, p]));
} catch (error) {
  if (error instanceof SyntaxError) {
    console.warn('[ProjectService] Invalid JSON in projects.json, creating backup and starting fresh');
    await fs.writeFile(`${this.dataFile}.backup`, await fs.readFile(this.dataFile, 'utf-8'));
  }
  await this.saveToFile();
}
```

### 8. **Process Name Validation Eksikliği**

**Dosya:** `src/app.ts` - Line 103-123  
**Açıklama:** Process name ve script path validation yok.

**Çözüm:**

```typescript
app.post('/processes', async (req, res, next) => {
  const { name, script } = req.body;

  // Validation ekle
  if (!name || !script) {
    return res.status(400).json({ message: 'Process name and script path are required' });
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return res.status(400).json({ message: 'Process name contains invalid characters' });
  }
  
  if (name.length > 50) {
    return res.status(400).json({ message: 'Process name too long (max 50 characters)' });
  }

  // ... rest of the code
});
```

### 9. **CORS Güvenlik Açığı**

**Dosya:** `src/app.ts` - Line 21-25  
**Açıklama:** CORS ayarı çok gevşek, tüm origin'lere izin veriyor.

**Çözüm:**

```typescript
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3001"],
    credentials: true
  }
});
```

### 10. **Terminal Buffer Overflow**

**Dosya:** `public/js/main.js` - Line 400-402  
**Açıklama:** Terminal'de log buffer sınırı yok, memory kullanımı artabilir.

**Çözüm:**

```javascript
const MAX_TERMINAL_LINES = 1000;
let terminalLineCount = 0;

function appendToTerminal(log) {
  // ... mevcut kod
  terminal.writeln(`${timestamp} [${procColor}${procName}\x1b[0m]: ${logMessage}`);
  
  terminalLineCount++;
  if (terminalLineCount > MAX_TERMINAL_LINES) {
    terminal.clear();
    terminal.writeln('\x1b[33m[SYSTEM] Terminal buffer cleared to prevent memory overflow\x1b[0m');
    terminalLineCount = 1;
  }
}
```

## 📊 Performans İyileştirmeleri

### 11. **Monitoring Interval Optimizasyonu**

**Dosya:** `src/app.ts` - Line 311-329  
**Açıklama:** 3 saniyede bir tüm process bilgisi gönderiliyor, network trafiği yüksek.

**Çözüm:**

```typescript
// Sadece değişen verileri gönder
let lastMonitoringData = new Map();

setInterval(async () => {
  try {
    const processes = await pm2Lib.getProcesses();
    const currentData = new Map();
    const changedData = [];
    
    processes.forEach(p => {
      const key = p.name;
      const current = { cpu: p.monit?.cpu || 0, memory: p.monit?.memory || 0 };
      const last = lastMonitoringData.get(key);
      
      if (!last || last.cpu !== current.cpu || last.memory !== current.memory) {
        changedData.push({
          name: p.name,
          pm_id: p.pm_id,
          monit: current
        });
      }
      currentData.set(key, current);
    });
    
    if (changedData.length > 0) {
      io.emit('processes:monitoring', changedData);
    }
    lastMonitoringData = currentData;
  } catch (error) {
    console.error('[Monitoring] Error:', error);
  }
}, MONITORING_INTERVAL);
```

## 🔧 Önerilen Acil Düzeltmeler

1. **PM2 Bus cleanup mekanizması ekle** (Kritik)
2. **Socket.IO memory leak'i düzelt** (Kritik)
3. **File save race condition'ı çöz** (Kritik)
4. **API güvenlik açığını kapat** (Yüksek)
5. **Socket reconnection ekle** (Orta)

## 🧪 Test Önerileri

1. **Memory leak testi:** Uzun süre çalıştırarak memory kullanımını izle
2. **Concurrent operation testi:** Aynı anda birden fazla proje işlemi yap
3. **Network failure testi:** Socket bağlantısını kes ve reconnection'ı test et
4. **Large data testi:** Çok sayıda process ve log ile performansı test et
5. **Security testi:** API endpoint'leri farklı auth senaryolarıyla test et

## ✅ Bug Doğrulama Durumu (2025-07-06)

### Doğrulanmış Kritik Buglar

1. **PM2 Bus Bağlantı Sızıntısı** ✅ DOĞRULANDI - `pm2Lib.ts:55-108` satırlarında cleanup mekanizması yok
2. **Socket.IO Event Listener Memory Leak** ✅ DOĞRULANDI - `app.ts:292-306` satırlarında her client için ayrı handler ekleniyor
3. **Dosya Yazma Race Condition** ✅ DOĞRULANDI - `ProjectService.ts:87-95` satırlarında debounce mekanizması race condition'a açık

### Doğrulanmış Orta Seviye Buglar

4. **API Kimlik Doğrulama Bypass** ✅ DOĞRULANDI - `app.ts:35-38` satırlarında API_KEY yoksa koruma devre dışı
5. **PM2 Process Start Error Handling** ✅ DOĞRULANDI - `pm2Lib.ts:131-155` satırlarında error durumunda cleanup yok
6. **Frontend Socket Reconnection Eksikliği** ✅ DOĞRULANDI - `main.js:88-94` satırlarında reconnection mekanizması yok

### Doğrulanmış Düşük Seviye Buglar

7. **JSON Parse Error Handling** ✅ DOĞRULANDI - `ProjectService.ts:52-58` satırlarında specific error handling yok
8. **Process Name Validation Eksikliği** ✅ DOĞRULANDI - `app.ts:104-109` satırlarında validation yok
9. **CORS Güvenlik Açığı** ✅ DOĞRULANDI - `app.ts:23-25` satırlarında origin: "*" kullanılıyor
10. **Terminal Buffer Overflow** ✅ DOĞRULANDI - `main.js` terminal buffer limit yok

## 📝 Notlar

- Bu analiz mevcut kod tabanına dayanmaktadır
- Production ortamında kullanım öncesi tüm kritik bug'ların düzeltilmesi önerilir
- Düzenli kod review ve automated testing implementasyonu önerilir
- Error logging ve monitoring sistemi geliştirilmelidir
- **Tüm ana buglar doğrulanmış ve fix edilmeye hazırdır**
