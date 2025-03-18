// Socket.IO bağlantısı
const socket = io();

// DOM elementleri
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

// Global değişkenler
let selectedProject = null;
let processes = [];
let projects = [];
let currentLogProcess = null;

// Process listesini yükle
async function loadProcesses() {
  try {
    const response = await fetch('/processes');
    processes = await response.json();
    renderProcessTable();
    updateProcessCheckboxes();
  } catch (error) {
    console.error('Error loading processes:', error);
    showToast('error', 'Failed to load processes');
  }
}

// Process tablosunu güncelle
function renderProcessTable() {
  processTableBody.innerHTML = '';
  
  // Önce projesiz process'leri ekle
  const unassignedProcesses = processes.filter(process => {
    return !projects.some(project => project.processes.includes(process.name));
  });

  if (unassignedProcesses.length > 0) {
    processTableBody.innerHTML += `
      <tr class="table-light">
        <td colspan="6"><strong>Unassigned Processes</strong></td>
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
          <td colspan="6"><strong>${project.name}</strong></td>
        </tr>
      `;
      projectProcesses.forEach(process => {
        addProcessRow(process);
      });
    }
  });
}

// Process satırı ekle
function addProcessRow(process) {
  const tr = document.createElement('tr');
  tr.className = 'process-row';
  tr.innerHTML = `
    <td class="ps-4">${process.name}</td>
    <td>${process.pm2_env?.status || 'unknown'}</td>
    <td>${process.pm2_env?.pm_uptime ? new Date(process.pm2_env.pm_uptime).toLocaleString() : 'N/A'}</td>
    <td>${process.monit?.cpu || 0}%</td>
    <td>${process.monit?.memory ? Math.round(process.monit.memory / (1024 * 1024)) : 0} MB</td>
    <td>
      <div class="btn-group" role="group">
        <button class="btn btn-sm btn-success me-1" onclick="startProcess('${process.name}')">Start</button>
        <button class="btn btn-sm btn-warning me-1" onclick="restartProcess('${process.name}')">Restart</button>
        <button class="btn btn-sm btn-danger me-1" onclick="stopProcess('${process.name}')">Stop</button>
        <button class="btn btn-sm btn-info me-1" onclick="showLogs('${process.name}')">Logs</button>
      </div>
    </td>
  `;
  processTableBody.appendChild(tr);
}

// Process başlat
async function startProcess(name) {
  try {
    await fetch(`/processes/${name}/start`, { method: 'PUT' });
    showToast('success', `Started process: ${name}`);
    loadProcesses();
  } catch (error) {
    console.error('Error starting process:', error);
    showToast('error', `Failed to start process: ${name}`);
  }
}

// Process yeniden başlat
async function restartProcess(name) {
  try {
    await fetch(`/processes/${name}/restart`, { method: 'PUT' });
    showToast('success', `Restarted process: ${name}`);
    loadProcesses();
  } catch (error) {
    console.error('Error restarting process:', error);
    showToast('error', `Failed to restart process: ${name}`);
  }
}

// Process durdur
async function stopProcess(name) {
  try {
    await fetch(`/processes/${name}/stop`, { method: 'PUT' });
    showToast('success', `Stopped process: ${name}`);
    loadProcesses();
  } catch (error) {
    console.error('Error stopping process:', error);
    showToast('error', `Failed to stop process: ${name}`);
  }
}

// Logları göster
function showLogs(processName = null) {
  // Önceki log dinleyicilerini temizle
  socket.off('log:out');
  
  // Console'u temizle ve göster
  consoleOutput.innerHTML = '';
  consoleBackground.style.display = 'block';
  
  // Process adını kaydet
  currentLogProcess = processName;

  // Log olaylarını dinle
  socket.on('log:out', (log) => {
    if (!currentLogProcess || log.process.name === currentLogProcess) {
      appendLog(log);
    }
  });
}

// Log ekle
function appendLog(log) {
  const p = document.createElement('p');
  p.innerHTML = `
    <span class="log-timestamp">${new Date(log.at).toLocaleTimeString()}</span>
    <span class="process-name">${log.process.name}</span>
    <span>${log.data}</span>
  `;
  consoleOutput.appendChild(p);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Toast mesajı göster
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

// Projeleri yükle
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

// Proje listesini güncelle
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
          <button class="btn btn-sm btn-outline-primary" onclick="editProject('${project.id}')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteProject('${project.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
    projectList.appendChild(li);
  });
}

// Process checkbox'larını güncelle
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

// Proje seç
function selectProject(projectId) {
  if (selectedProject?.id === projectId) {
    selectedProject = null;
  } else {
    selectedProject = projects.find(p => p.id === projectId);
  }
  renderProjectList();
  renderProcessTable();
}

// Yeni proje modalını aç
function newProject() {
  selectedProject = null;
  projectForm.reset();
  updateProcessCheckboxes();
  projectModal.show();
}

// Proje düzenle
function editProject(projectId) {
  selectedProject = projects.find(p => p.id === projectId);
  if (selectedProject) {
    document.getElementById('projectName').value = selectedProject.name;
    document.getElementById('projectDescription').value = selectedProject.description || '';
    updateProcessCheckboxes();
    projectModal.show();
  }
}

// Proje sil
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
      console.error('Error deleting project:', error);
      showToast('error', 'Failed to delete project');
    }
  }
}

// Proje kaydet
async function saveProject(event) {
  event.preventDefault();
  
  const formData = new FormData(projectForm);
  const projectData = {
    name: formData.get('name'),
    description: formData.get('description'),
    processes: Array.from(document.querySelectorAll('#processCheckboxes input:checked')).map(cb => cb.value)
  };
  
  try {
    const method = selectedProject ? 'PUT' : 'POST';
    const url = selectedProject ? `/projects/${selectedProject.id}` : '/projects';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });
    
    if (response.ok) {
      showToast('success', `Project ${selectedProject ? 'updated' : 'created'}`);
      projectModal.hide();
      loadProjects();
    } else {
      throw new Error('Failed to save project');
    }
  } catch (error) {
    console.error('Error saving project:', error);
    showToast('error', 'Failed to save project');
  }
}

// Socket.IO bağlantı durumu
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Event listeners
projectForm.addEventListener('submit', saveProject);
showAllLogsBtn.addEventListener('click', () => showLogs());
clearConsoleBtn.addEventListener('click', () => {
  consoleOutput.innerHTML = '';
});

// Başlangıçta verileri yükle
loadProcesses();
loadProjects();

// Her 5 saniyede bir process listesini güncelle
setInterval(loadProcesses, 5000);
