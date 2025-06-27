/**
 * PM2 Web UI Ana JavaScript Dosyası
 * @author A. Kerem Gök
 * @description Bu dosya, PM2 süreçlerini yönetmek için gerekli tüm frontend işlevselliğini içerir
 */

// Socket.IO bağlantısı kurulumu
const socket = io();

/**
 * DOM Elementlerinin Tanımlanması
 * Bu bölümde, uygulama içinde kullanılacak tüm HTML elementleri seçiliyor
 */
const processTable = document.getElementById('tbl-processes');
const processTableBody = document.querySelector('#tbl-processes tbody');
const consoleBackground = document.getElementById('console-background');
const consoleOutput = document.getElementById('console');
const projectList = document.getElementById('project-list');
const projectModal = new bootstrap.Modal(document.getElementById('projectModal'));
const projectForm = document.getElementById('projectForm');
const processCheckboxes = document.getElementById('processCheckboxes');
const showAllLogsBtn = document.getElementById('show-all-logs');
const clearConsoleBtn = document.getElementById('clear-console');
const newProjectBtn = document.getElementById('new-project');
const saveProjectBtn = document.getElementById('saveProject');
const toggleFullscreenBtn = document.getElementById('toggle-fullscreen');
const mainContent = document.querySelector('main');
const themeSwitchBtn = document.getElementById('theme-switch');
const newProcessBtn = document.getElementById('new-process-btn');
const newProcessModal = new bootstrap.Modal(document.getElementById('newProcessModal'));
const newProcessForm = document.getElementById('newProcessForm');
const startNewProcessBtn = document.getElementById('startNewProcessBtn');

/**
 * Global Değişkenler
 * @description Uygulama genelinde kullanılacak durum değişkenleri
 */
let selectedProject = null;  // Seçili projeyi tutar
let processes = [];         // Tüm PM2 süreçlerini tutar
let projects = [];         // Tüm projeleri tutar
let currentLogProcess = null; // Şu anda görüntülenen log sürecini tutar
let isModalOpen = false;    // Modal penceresinin durumunu tutar

/**
 * Tema Yönetimi Fonksiyonları
 * @description Açık ve koyu tema arasında geçişi yönetir
 */

/**
 * Kaydedilmiş veya sistem tercihine göre temayı uygular
 */
function applyInitialTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
  }
}

/**
 * Temayı değiştirir ve tercihi kaydeder
 */
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
}

/**
 * Süreç Yönetimi Fonksiyonları
 * @description PM2 süreçlerinin yüklenmesi ve yönetilmesi için gerekli fonksiyonlar
 */

/**
 * Tüm PM2 süreçlerini sunucudan yükler
 * @async
 * @returns {Promise<void>}
 */
async function loadProcesses() {
  try {
    const response = await fetch('/processes');
    updateProcesses(await response.json());
  } catch (error) {
    console.error('Error loading processes:', error);
    showToast('error', 'Failed to load processes');
  }
}

/**
 * Süreç listesini günceller
 * @param {Array} newProcesses - Yeni süreç listesi
 */
function updateProcesses(newProcesses) {
  if (isModalOpen) return; // Modal açıksa güncelleme yapma

  processes = newProcesses;
  renderProcessTable();
}

/**
 * Süreç tablosunu HTML olarak oluşturur ve görüntüler
 * Önce projesiz süreçleri, sonra proje bazlı süreçleri listeler
 */
function renderProcessTable() {
  processTableBody.innerHTML = '';

  // Önce projesiz süreçleri ekle
  const unassignedProcesses = processes.filter(process => {
    return !projects.some(project => project.processes.includes(process.name));
  });

  if (unassignedProcesses.length > 0) {
    processTableBody.innerHTML += `
      <tr class="table-light">
        <td colspan="5"><strong>Unassigned Processes</strong></td>
        <td class="text-end">
          <button class="btn btn-sm btn-info" onclick="showProjectLogs(null)">
            <i class="bi bi-terminal"></i> Logs
          </button>
        </td>
      </tr>
    `;
    unassignedProcesses.forEach(process => {
      addProcessRow(process);
    });
  }

  // Sonra her projenin process'lerini ekle
  projects.forEach(project => {
    const projectProcesses = processes.filter(process => project.processes.includes(process.name));

    if (projectProcesses.length > 0) {
      processTableBody.innerHTML += `
        <tr class="table-info">
          <td colspan="5"><strong>${project.name}</strong></td>
          <td class="text-end">
            <button class="btn btn-sm btn-info" onclick="showProjectLogs('${project.id}')">
              <i class="bi bi-terminal"></i> Logs
            </button>
          </td>
        </tr>
      `;
      projectProcesses.forEach(process => {
        addProcessRow(process);
      });
    }
  });
}

/**
 * Tek bir süreç satırını HTML tablosuna ekler
 * @param {Object} process - Eklenecek süreç bilgisi
 */
function addProcessRow(process) {
  const tr = document.createElement('tr');
  tr.className = 'process-row';
  tr.innerHTML = `
    <td>${process.name}</td>
    <td>${process.pm2_env?.status || 'unknown'}</td>
    <td>${process.pm2_env?.pm_uptime ? new Date(process.pm2_env.pm_uptime).toLocaleString() : 'N/A'}</td>
    <td>
      <span>CPU: ${process.monit?.cpu || 0}%</span>
      <br>
      <span>Memory: ${process.monit?.memory ? Math.round(process.monit.memory / (1024 * 1024)) : 0}MB</span>
    </td>
    <td class="text-end">
      <div class="btn-group" role="group">
        <button class="btn btn-sm btn-success me-1" onclick="performProcessAction('${process.name}', 'start')">Start</button>
        <button class="btn btn-sm btn-warning me-1" onclick="performProcessAction('${process.name}', 'restart')">Restart</button>
        <button class="btn btn-sm btn-danger me-1" onclick="performProcessAction('${process.name}', 'stop')">Stop</button>
        <button class="btn btn-sm btn-info me-1" onclick="showLogs('${process.name}')">Logs</button>
      </div>
    </td>
  `;
  processTableBody.appendChild(tr);
}

/**
 * Süreç Kontrol Fonksiyonları
 * @description PM2 süreçlerini başlatma, durdurma ve yeniden başlatma işlemleri
 */

/**
 * Belirtilen süreç üzerinde bir eylem gerçekleştirir
 * @param {string} name - Üzerinde işlem yapılacak sürecin adı
 * @param {'start'|'stop'|'restart'} action - Yapılacak eylem
 */
async function performProcessAction(name, action) {
  // Arayüzde anında geri bildirim için tabloyu soluklaştır
  processTable.style.opacity = '0.5';
  try {
    await fetch(`/processes/${name}/${action}`, { method: 'PUT' });
    showToast('success', `Action '${action}' sent for process: ${name}`);
    // Artık loadProcesses() çağrısına gerek yok, sunucu güncelleme gönderecek.
  } catch (error) {
    console.error(`Error performing action ${action} on process:`, error);
    showToast('error', `Failed to ${action} process: ${name}`);
    // Hata durumunda tabloyu normale döndür
    processTable.style.opacity = '1';
  }
}

/**
 * Log Yönetimi Fonksiyonları
 * @description Süreç loglarının görüntülenmesi ve yönetimi için gerekli fonksiyonlar
 */

/**
 * Belirtilen sürecin loglarını görüntüler
 * @param {string|null} processName - Görüntülenecek sürecin adı, null ise tüm loglar görüntülenir
 */
function showLogs(processName = null) {
  // Önceki log dinleyicilerini temizle
  socket.off('log:out');

  // Console'u temizle ve göster
  consoleOutput.innerHTML = '';
  consoleBackground.style.display = 'block';

  // Süreç adını kaydet
  currentLogProcess = processName;

  // Log olaylarını dinle
  socket.on('log:out', (log) => {
    if (!currentLogProcess || log.process.name === currentLogProcess) {
      appendLog(log);
    }
  });
}

/**
 * Belirli bir projenin tüm süreçlerinin loglarını görüntüler
 * @param {string|null} projectId - Görüntülenecek projenin ID'si, null ise projesiz süreçlerin logları görüntülenir
 */
function showProjectLogs(projectId) {
  // Önceki log dinleyicilerini temizle
  socket.off('log:out');

  // Console'u temizle ve göster
  consoleOutput.innerHTML = '';
  consoleBackground.style.display = 'block';

  // Süreç listesini al
  let projectProcesses;
  if (projectId === null) {
    // Projesiz süreçler
    projectProcesses = processes.filter(process => {
      return !projects.some(project => project.processes.includes(process.name));
    }).map(p => p.name);
  } else {
    // Proje süreçleri
    const project = projects.find(p => p.id === projectId);
    projectProcesses = project ? project.processes : [];
  }

  // Log olaylarını dinle
  socket.on('log:out', (log) => {
    if (projectProcesses.includes(log.process.name)) {
      appendLog(log);
    }
  });
}

/**
 * Yeni bir log satırı ekler
 * @param {Object} log - Log verisi
 * @param {Date} log.at - Logun oluşturulma zamanı
 * @param {Object} log.process - Süreç bilgisi
 * @param {string} log.data - Log içeriği
 */
function appendLog(log) {
  const p = document.createElement('p');
  p.innerHTML = `
    <span class="log-timestamp">${new Date(log.at).toLocaleTimeString()}</span>
    <span class="process-name">${log.process.name}</span>
    <span>${log.data}</span>
  `;
  consoleOutput.appendChild(p);

  // En son log'a scroll yap
  const shouldScroll = consoleOutput.scrollTop + consoleOutput.clientHeight >= consoleOutput.scrollHeight - 50;
  if (shouldScroll) {
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }
}

/**
 * Yardımcı Fonksiyonlar
 */

/**
 * Bildirim toast mesajı gösterir
 * @param {string} type - Bildirim tipi ('success' veya 'error')
 * @param {string} message - Gösterilecek mesaj
 */
function showToast(type, message) {
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'success'} border-0`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  document.querySelector('.toast-container').appendChild(toast);
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();

  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

/**
 * Süreç checkbox'larını günceller
 */
function updateProcessCheckboxes() {
  processCheckboxes.innerHTML = '';
  processes.forEach(process => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.innerHTML = `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" value="${process.name}" 
               id="process-${process.name}" ${selectedProject?.processes.includes(process.name) ? 'checked' : ''}>
        <label class="form-check-label" for="process-${process.name}">
          ${process.name}
        </label>
      </div>
    `;
    processCheckboxes.appendChild(li);
  });
}

/**
 * Proje seçimini değiştirir
 * @param {string} projectId - Seçilecek projenin ID'si
 */
function selectProject(projectId) {
  if (selectedProject?.id === projectId) {
    selectedProject = null;
  } else {
    selectedProject = projects.find(p => p.id === projectId);
  }
  renderProjectList();
  renderProcessTable();
}

/**
 * Proje Yönetimi Fonksiyonları
 * @description Projelerin yüklenmesi, oluşturulması, düzenlenmesi ve silinmesi için gerekli fonksiyonlar
 */

/**
 * Tüm projeleri sunucudan yükler
 * @async
 * @returns {Promise<void>}
 */
async function loadProjects() {
  try {
    const response = await fetch('/projects');
    projects = await response.json();
    renderProjectList();
  } catch (error) {
    console.error('Error loading projects:', error);
    showToast('error', 'Failed to load projects');
  }
}

/**
 * Proje listesini HTML olarak oluşturur ve görüntüler
 */
function renderProjectList() {
  projectList.innerHTML = '';
  projects.forEach(project => {
    const li = document.createElement('li');
    li.className = 'nav-item project-item';
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <a class="nav-link ${selectedProject?.id === project.id ? 'active' : ''}" 
           onclick="selectProject('${project.id}')">
          ${project.name}
        </a>
        <div class="btn-group">
          <button class="btn btn-sm btn-primary" onclick="editProject('${project.id}')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteProject('${project.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
    projectList.appendChild(li);
  });
}

/**
 * Yeni proje oluşturma modalını açar
 */
function newProject() {
  selectedProject = null;
  projectForm.reset();
  document.getElementById('projectId').value = '';
  isModalOpen = true;
  projectModal.show();

  // Süreç listesini güncelle
  updateProcessCheckboxes();
}

/**
 * Var olan bir projeyi düzenleme modalını açar
 * @param {string} projectId - Düzenlenecek projenin ID'si
 */
function editProject(projectId) {
  selectedProject = projects.find(p => p.id === projectId);
  if (selectedProject) {
    document.getElementById('projectName').value = selectedProject.name;
    document.getElementById('projectDescription').value = selectedProject.description || '';
    isModalOpen = true;
    projectModal.show();
    updateProcessCheckboxes();
  }
}

/**
 * Belirtilen projeyi siler
 * @param {string} projectId - Silinecek projenin ID'si
 */
async function deleteProject(projectId) {
  if (confirm('Are you sure you want to delete this project?')) {
    try {
      await fetch(`/projects/${projectId}`, { method: 'DELETE' });
      if (selectedProject?.id === projectId) {
        selectedProject = null;
      }
      showToast('success', 'Project deleted');
      loadProjects();
      renderProcessTable();
    } catch (error) {
      showToast('error', 'Failed to delete project');
    }
  }
}

/**
 * Proje formunu kaydeder (yeni proje oluşturma veya güncelleme)
 * @param {Event} event - Form submit olayı
 */
async function saveProject(event) {
  event.preventDefault();

  const projectData = {
    name: document.getElementById('projectName').value,
    description: document.getElementById('projectDescription').value,
    processes: Array.from(document.querySelectorAll('#processCheckboxes input:checked')).map(cb => cb.value)
  };

  try {
    const method = selectedProject ? 'PUT' : 'POST';
    const url = selectedProject ? `/projects/${selectedProject.id}` : '/projects';
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    });
    if (response.ok) {
      showToast('success', 'Project saved');
      loadProjects();
      renderProcessTable();
    } else {
      showToast('error', 'Failed to save project');
    }
  } catch (error) {
    console.error('Error saving project:', error);
    showToast('error', 'Failed to save project');
  }
}

/**
 * Olay Dinleyicileri ve Başlangıç Ayarları
 */

// Modal kapatıldığında
document.getElementById('projectModal').addEventListener('hidden.bs.modal', () => {
  isModalOpen = false;
});

// Socket.IO bağlantı durumu
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Buton olay dinleyicileri
showAllLogsBtn.addEventListener('click', () => showLogs());
clearConsoleBtn.addEventListener('click', () => {
  consoleOutput.innerHTML = '';
});
newProjectBtn.addEventListener('click', newProject);
saveProjectBtn.addEventListener('click', saveProject);
toggleFullscreenBtn.addEventListener('click', () => {
  const isFullscreen = consoleBackground.classList.toggle('fullscreen');
  mainContent.classList.toggle('fullscreen', isFullscreen);
  document.querySelector('.console-controls').classList.toggle('fullscreen', isFullscreen);
  toggleFullscreenBtn.querySelector('i').classList.toggle('bi-arrows-fullscreen');
  toggleFullscreenBtn.querySelector('i').classList.toggle('bi-fullscreen-exit');
});

// Başlangıçta verileri yükle
loadProjects();
loadProcesses();

// Sunucudan gelen süreç güncelleme olayını dinle
socket.on('processes:updated', (updatedProcesses) => {
  console.log('Received process update from server.');
  updateProcesses(updatedProcesses);
  // Arayüzü normale döndür
  processTable.style.opacity = '1';
});

// Tema değiştirme butonu
themeSwitchBtn.addEventListener('click', toggleTheme);

// "Yeni Süreç" butonu
newProcessBtn.addEventListener('click', () => {
  newProcessForm.reset(); // Formu temizle
  newProcessModal.show();
});

// "Yeni Süreç" formunu gönderme butonu
startNewProcessBtn.addEventListener('click', async () => {
  const nameInput = document.getElementById('processNameInput');
  const scriptInput = document.getElementById('scriptPathInput');
  const name = nameInput.value.trim();
  const script = scriptInput.value.trim();

  if (!name || !script) {
    showToast('error', 'Process Name and Script Path are required.');
    return;
  }

  try {
    const response = await fetch('/processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, script }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to start process');
    }

    showToast('success', `Process '${name}' is starting...`);
    newProcessModal.hide();
    // Arayüzün güncellenmesini WebSocket olayı halledecek
  } catch (error) {
    console.error('Error starting new process:', error);
    showToast('error', `Error: ${error.message}`);
  }
});

// Konsol arka planına tıklandığında konsolu gizle
consoleBackground.addEventListener('click', (event) => {
  if (event.target === consoleBackground) {
    consoleBackground.style.display = 'none';
  }
});