/**
 * Hermes PM2 Web UI Ana Uygulama Dosyası
 * @author A. Kerem Gök
 * @description Express sunucusu ve Socket.IO bağlantılarının yönetildiği ana uygulama
 */

import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import pm2Lib from './pm2Lib';
import ProjectService from './services/ProjectService';
import { CreateProjectDto, UpdateProjectDto } from './models/Project';
import { StartOptions } from 'pm2';

/**
 * Express ve Socket.IO Sunucu Kurulumu
 */
const app = express();
const server = createServer(app);
const io = new Server(server);

// Middleware ayarları
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

/**
 * PM2 Süreç Yönetimi API Endpoint'leri
 * ---------------------------------- */

/**
 * Tüm PM2 süreçlerini listeler
 * @route GET /processes
 */
app.get('/processes', async (req, res) => {
  try {
    const processes = await pm2Lib.getProcesses();
    res.json(processes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get processes' });
  }
});

/**
 * PM2 süreçleri üzerinde işlem yapar
 * @route PUT /processes/:name/:action
 * @param name - Süreç adı
 * @param action - Yapılacak işlem (start, stop, restart)
 */
app.put('/processes/:name/:action', async (req, res) => {
  const { name, action } = req.params;
  try {
    let result;
    switch (action) {
      case 'start':
        result = await pm2Lib.startProcess(name);
        break;
      case 'stop':
        result = await pm2Lib.stopProcess(name);
        break;
      case 'restart':
        result = await pm2Lib.restartProcess(name);
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: `Failed to ${action} process` });
  }
});

/**
 * Yeni PM2 süreci başlatır
 * @route POST /processes
 * @body { name: string, script: string } - Başlatılacak süreç bilgileri
 */
app.post('/processes', async (req, res) => {
  const { name, script } = req.body;

  if (!name || !script) {
    return res.status(400).json({ message: 'Process name and script path are required' });
  }

  try {
    // Arayüzden gelen temel bilgilerle bir başlangıç yapılandırması oluştur
    const startOptions: StartOptions = {
      name,
      script,
    };

    const proc = await pm2Lib.startProcess(startOptions);
    // Başarılı olursa, pm2Lib'deki olay dinleyici durumu tüm istemcilere zaten bildirecektir.
    res.status(201).json(proc);
  } catch (error: any) {
    console.error('Failed to start new process:', error);
    res.status(500).json({ message: error.message || 'Failed to start new process' });
  }
});

/**
 * Proje Yönetimi API Endpoint'leri
 * ------------------------------ */

/**
 * Tüm projeleri listeler
 * @route GET /projects
 */
app.get('/projects', async (req, res) => {
  try {
    const projects = await ProjectService.getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get projects' });
  }
});

/**
 * ID'ye göre proje getirir
 * @route GET /projects/:id
 * @param id - Proje ID'si
 */
app.get('/projects/:id', async (req, res) => {
  try {
    const project = await ProjectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get project' });
  }
});

/**
 * Yeni proje oluşturur
 * @route POST /projects
 * @body CreateProjectDto - Proje oluşturma bilgileri
 */
app.post('/projects', async (req, res) => {
  try {
    const dto: CreateProjectDto = req.body;
    const project = await ProjectService.createProject(dto);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create project' });
  }
});

/**
 * Mevcut projeyi günceller
 * @route PUT /projects/:id
 * @param id - Güncellenecek proje ID'si
 * @body UpdateProjectDto - Proje güncelleme bilgileri
 */
app.put('/projects/:id', async (req, res) => {
  try {
    const dto: UpdateProjectDto = req.body;
    const project = await ProjectService.updateProject(req.params.id, dto);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update project' });
  }
});

/**
 * Projeyi siler
 * @route DELETE /projects/:id
 * @param id - Silinecek proje ID'si
 */
app.delete('/projects/:id', async (req, res) => {
  try {
    const deleted = await ProjectService.deleteProject(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

/**
 * Proje-Süreç İlişki Yönetimi API Endpoint'leri
 * ------------------------------------------- */

/**
 * Projeye yeni süreç ekler
 * @route POST /projects/:id/processes/:processName
 * @param id - Proje ID'si
 * @param processName - Eklenecek sürecin adı
 */
app.post('/projects/:id/processes/:processName', async (req, res) => {
  try {
    const project = await ProjectService.addProcessToProject(req.params.id, req.params.processName);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add process to project' });
  }
});

/**
 * Projeden süreç kaldırır
 * @route DELETE /projects/:id/processes/:processName
 * @param id - Proje ID'si
 * @param processName - Kaldırılacak sürecin adı
 */
app.delete('/projects/:id/processes/:processName', async (req, res) => {
  try {
    const project = await ProjectService.removeProcessFromProject(req.params.id, req.params.processName);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove process from project' });
  }
});

/**
 * Socket.IO Gerçek Zamanlı Bağlantı Yönetimi
 * --------------------------------------- */

// PM2 olaylarını dinlemeye başla
pm2Lib.init();

// Genel süreç durumu değişikliklerini dinle ve tüm istemcilere yayınla
pm2Lib.on('status_change', async (data) => {
  console.log(`[Socket.IO] Broadcasting status change for process: ${data.name}, event: ${data.event}`);
  try {
    const processes = await pm2Lib.getProcesses();
    io.emit('processes:updated', processes);
  } catch (error) {
    console.error('Failed to get and broadcast process list after status change:', error);
  }
});

/**
 * Yeni istemci bağlantısı kurulduğunda
 * @event connection
 */
io.on('connection', (socket) => {
  console.log(`[Socket.IO] New client connected: ${socket.id}`);

  // Her bağlantı için ayrı log dinleyici oluştur ve sadece o istemciye gönder
  const logHandler = (log: any) => {
    socket.emit('log:out', log);
  };
  pm2Lib.on('log', logHandler);

  /**
   * İstemci bağlantısı koptuğunda
   * @event disconnect
   */
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    // İstemciye özel log dinleyicisini kaldır
    pm2Lib.off('log', logHandler);
  });
});

/**
 * Sunucu Başlatma
 * -------------- */
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Listening on :${PORT}`);
});
