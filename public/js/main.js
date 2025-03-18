// Process Manager UI Controller
class ProcessManager {
  constructor() {
    this.socket = io();
    this.projectModal = new bootstrap.Modal(document.getElementById('projectModal'));
    this.currentProject = null;
    this.processes = [];
    this.projects = [];
    this.currentLogProcess = null;
    this.initializeEventListeners();
    this.startAutoRefresh();
    this.loadProjects();
    this.loadProcesses();
  }

  // Initialize all event listeners
  initializeEventListeners() {
    $(document).on('click', 'button[data-action]', (e) => this.handleActionButton(e));
    $('#clear-console').on('click', () => this.clearConsole());
    $('#show-all-logs').on('click', () => this.showStdLog());
    $('#new-project').on('click', () => this.newProject());
    $('#saveProject').on('click', () => this.saveProject());
    $(document).on('click', '.project-item', (e) => this.selectProject($(e.currentTarget).data('id')));
    $(document).on('click', '.edit-project', (e) => {
      e.stopPropagation();
      this.editProject($(e.currentTarget).closest('.project-item').data('id'));
    });
    $(document).on('click', '.delete-project', (e) => {
      e.stopPropagation();
      this.deleteProject($(e.currentTarget).closest('.project-item').data('id'));
    });
  }

  // Start auto-refresh for process status
  startAutoRefresh() {
    this.updateProcessesStatus();
    setInterval(() => this.updateProcessesStatus(), 15000);
  }

  // Load all projects
  async loadProjects() {
    try {
      const response = await fetch('/projects');
      this.projects = await response.json();
      this.renderProjectList();
    } catch (error) {
      this.showToast('error', 'Failed to load projects');
    }
  }

  // Load all processes
  async loadProcesses() {
    try {
      const response = await fetch('/processes');
      this.processes = await response.json();
      this.renderProcessTable();
      this.updateProcessCheckboxes();
    } catch (error) {
      this.showToast('error', 'Failed to load processes');
    }
  }

  // Render projects in sidebar
  renderProjectList() {
    const projectList = $('#project-list');
    projectList.empty();
    
    this.projects.forEach(project => {
      projectList.append(`
        <li class="nav-item project-item">
          <div class="nav-link d-flex justify-content-between align-items-center" 
               data-id="${project.id}">
            <a class="nav-link ${this.currentProject?.id === project.id ? 'active' : ''}" 
               onclick="selectProject('${project.id}')">
              ${project.name}
            </a>
            <div class="btn-group">
              <button class="btn btn-sm btn-primary me-1" onclick="editProject('${project.id}')">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-danger me-1" onclick="deleteProject('${project.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </li>
      `);
    });
  }

  // Render process table
  renderProcessTable() {
    const processTableBody = $('#process-table-body');
    processTableBody.empty();
    
    const filteredProcesses = this.currentProject
      ? this.processes.filter(p => this.currentProject.processes.includes(p.name))
      : this.processes;

    filteredProcesses.forEach(process => {
      processTableBody.append(`
        <tr id="${process.name}" class="process-row">
          <td>${process.name}</td>
          <td>${process.pm2_env?.status || 'unknown'}</td>
          <td>${process.pm2_env?.pm_uptime ? new Date(process.pm2_env.pm_uptime).toLocaleString() : 'N/A'}</td>
          <td>${process.monit?.cpu || 0}%</td>
          <td>${process.monit?.memory ? Math.round(process.monit.memory / (1024 * 1024)) : 0} MB</td>
          <td class="text-end">
            <div class="btn-group" role="group">
              <button class="btn btn-sm btn-success" onclick="startProcess('${process.name}')">Start</button>
              <button class="btn btn-sm btn-warning" onclick="restartProcess('${process.name}')">Restart</button>
              <button class="btn btn-sm btn-danger" onclick="stopProcess('${process.name}')">Stop</button>
              <button class="btn btn-sm btn-info" onclick="showLogs('${process.name}')">Logs</button>
            </div>
          </td>
        </tr>
      `);
    });
  }

  // Update process checkboxes
  updateProcessCheckboxes() {
    const processCheckboxes = $('#processCheckboxes');
    processCheckboxes.empty();
    
    this.processes.forEach(process => {
      processCheckboxes.append(`
        <label class="list-group-item">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${process.name}" 
                   id="process-${process.name}" ${this.currentProject?.processes.includes(process.name) ? 'checked' : ''}>
            <label class="form-check-label" for="process-${process.name}">
              ${process.name}
            </label>
          </div>
        </label>
      `);
    });
  }

  // Show project modal for create/edit
  async showProjectModal(project = null) {
    const modal = $('#projectModal');
    modal.find('#projectId').val(project?.id || '');
    modal.find('#projectName').val(project?.name || '');
    modal.find('#projectDescription').val(project?.description || '');

    this.projectModal.show();
  }

  // Save project (create or update)
  async saveProject() {
    const projectId = $('#projectId').val();
    const projectData = {
      name: $('#projectName').val(),
      description: $('#projectDescription').val(),
      processes: $('#processCheckboxes input:checked').map(function() {
        return $(this).val();
      }).get()
    };

    try {
      const url = projectId ? `/projects/${projectId}` : '/projects';
      const method = projectId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) throw new Error('Failed to save project');
      
      this.projectModal.hide();
      await this.loadProjects();
      this.showToast('success', `Project ${projectId ? 'updated' : 'created'} successfully`);
    } catch (error) {
      this.showToast('error', error.message);
    }
  }

  // Edit existing project
  async editProject(projectId) {
    try {
      const response = await fetch(`/projects/${projectId}`);
      const project = await response.json();
      this.showProjectModal(project);
    } catch (error) {
      this.showToast('error', 'Failed to load project details');
    }
  }

  // Delete project
  async deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/projects/${projectId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete project');
      
      await this.loadProjects();
      this.showToast('success', 'Project deleted successfully');
    } catch (error) {
      this.showToast('error', error.message);
    }
  }

  // Select project and filter processes
  async selectProject(projectId) {
    try {
      if (this.currentProject === projectId) {
        this.currentProject = null;
      } else {
        const response = await fetch(`/projects/${projectId}`);
        this.currentProject = await response.json();
      }
      this.renderProjectList();
      this.renderProcessTable();
    } catch (error) {
      this.showToast('error', 'Failed to load project processes');
    }
  }

  // Get appropriate badge for process status
  getStatusBadge(status) {
    const badges = {
      'online': ['success', 'check-circle-fill'],
      'stopped': ['danger', 'stop-circle-fill'],
      'errored': ['warning', 'exclamation-circle-fill'],
      'launching': ['info', 'arrow-clockwise']
    };
    const [type, icon] = badges[status] || ['secondary', 'question-circle-fill'];
    return `
      <div class="d-flex align-items-center">
        <i class="bi bi-${icon} text-${type} me-2"></i>
        <span class="badge bg-${type}">${status}</span>
      </div>
    `;
  }

  // Get action buttons based on process status
  getActionButtons(status, name) {
    const buttons = [];
    
    if (status === 'online') {
      buttons.push(`
        <button type="button" class="btn btn-sm btn-outline-danger" data-action="stop" title="Stop Process">
          <i class="bi bi-stop-circle me-1"></i>Stop
        </button>
        <button type="button" class="btn btn-sm btn-outline-info" data-action="tail-log" title="View Logs">
          <i class="bi bi-terminal me-1"></i>Logs
        </button>
      `);
    } else {
      buttons.push(`
        <button type="button" class="btn btn-sm btn-outline-success" data-action="start" title="Start Process">
          <i class="bi bi-play-circle me-1"></i>Start
        </button>
      `);
    }

    buttons.push(`
      <button type="button" class="btn btn-sm btn-outline-primary" data-action="restart" title="Restart Process">
        <i class="bi bi-arrow-repeat me-1"></i>Restart
      </button>
    `);

    return `<div class="btn-group">${buttons.join('')}</div>`;
  }

  // Format memory size
  formatMemory(bytes) {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb < 1024 
      ? `${mb.toFixed(1)} MB`
      : `${(mb/1024).toFixed(1)} GB`;
  }

  // Get processes from API
  async getProcesses() {
    const response = await fetch('/processes');
    if (!response.ok) throw new Error('Failed to fetch processes');
    return await response.json();
  }

  // Update processes table
  async updateProcessesStatus(filterProcesses = null) {
    try {
      const processes = await this.getProcesses();
      const filteredProcesses = filterProcesses 
        ? processes.filter(p => filterProcesses.includes(p.name))
        : processes;

      const rows = filteredProcesses.map(process => `
        <tr id="${process.name}" class="process-row">
          <td>
            <div class="fw-bold">${process.name}</div>
            <small class="text-muted">PID: ${process.pid || 'N/A'}</small>
          </td>
          <td>${this.getStatusBadge(process.pm2_env.status)}</td>
          <td>
            <div class="d-flex flex-column">
              <span class="mb-1">
                <i class="bi bi-cpu me-2"></i>CPU: ${process.monit ? process.monit.cpu + '%' : 'N/A'}
              </span>
              <span>
                <i class="bi bi-memory me-2"></i>RAM: ${process.monit ? this.formatMemory(process.monit.memory) : 'N/A'}
              </span>
            </div>
          </td>
          <td class="text-end">
            ${this.getActionButtons(process.pm2_env.status, process.name)}
          </td>
        </tr>
      `);

      $('#tbl-processes tbody').html(rows.join(''));
      $('.refresh-status').html(`<i class="bi bi-clock me-1"></i>Last updated: ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error('Error updating processes:', error);
      this.showToast('error', 'Failed to update processes status');
    }
  }

  // Handle process action buttons
  async handleActionButton(event) {
    const button = $(event.currentTarget);
    const action = button.data('action');
    const process = button.closest('tr').attr('id');

    if (!action || !process) return;

    if (['start', 'stop', 'restart'].includes(action)) {
      try {
        button.prop('disabled', true);
        const response = await fetch(`/processes/${process}/${action}`, { method: 'PUT' });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message);
        
        this.showToast('success', `Successfully ${action}ed process ${process}`);
        await this.updateProcessesStatus();
      } catch (error) {
        this.showToast('error', error.message);
      } finally {
        button.prop('disabled', false);
      }
    } else if (action === 'tail-log') {
      this.showStdLog(process);
    }
  }

  // Show process logs
  showStdLog(process = null) {
    // Önceki log dinleyicilerini temizle
    this.socket.off('log:out');
    
    // Console'u temizle ve göster
    const consoleOutput = $('#console');
    consoleOutput.empty();
    const consoleBackground = $('#console-background');
    consoleBackground.css('display', 'block');
    
    // Process adını kaydet
    this.currentLogProcess = process;
    
    console.log('Showing logs for:', process || 'all processes');
    
    // Log olaylarını dinle
    this.socket.on('log:out', (log) => {
      console.log('Received log:', log);
      if (!this.currentLogProcess || log.process.name === this.currentLogProcess) {
        this.appendLog(log);
      }
    });
  }

  // Log ekle
  appendLog(log) {
    const consoleOutput = $('#console');
    const p = document.createElement('p');
    p.innerHTML = `
      <span class="log-timestamp">${new Date(log.at).toLocaleTimeString()}</span>
      <span class="process-name">${log.process.name}</span>
      <span>${this.escapeHtml(log.data)}</span>
    `;
    consoleOutput.append(p);
    consoleOutput.scrollTop(consoleOutput[0].scrollHeight);
  }

  // Clear console output
  clearConsole() {
    const consoleOutput = $('#console');
    consoleOutput.empty();
  }

  // Scroll console to bottom
  scrollConsoleToBottom() {
    const consoleBackground = $('#console-background');
    consoleBackground.animate({ scrollTop: consoleBackground[0].scrollHeight }, 200);
  }

  // Show toast notification
  showToast(type, message) {
    const toast = $(`
      <div class="toast-container position-fixed bottom-0 end-0 p-3">
        <div class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'success'} border-0">
          <div class="d-flex">
            <div class="toast-body">
              <i class="bi bi-${type === 'error' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
              ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
          </div>
        </div>
      </div>
    `);
    
    $('body').append(toast);
    const bsToast = new bootstrap.Toast(toast.find('.toast'));
    bsToast.show();
    
    toast.on('hidden.bs.toast', () => toast.remove());
  }

  // Escape HTML to prevent XSS
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Yeni proje modalını aç
  newProject() {
    this.currentProject = null;
    const projectForm = $('#projectForm');
    projectForm[0].reset();
    this.updateProcessCheckboxes();
    this.projectModal.show();
  }

  // Proje düzenle
  editProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      const projectName = $('#projectName');
      projectName.val(project.name);
      const projectDescription = $('#projectDescription');
      projectDescription.val(project.description || '');
      this.updateProcessCheckboxes();
      this.projectModal.show();
    }
  }

  // Proje sil
  async deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/projects/${projectId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete project');
      
      if (this.currentProject?.id === projectId) {
        this.currentProject = null;
      }
      this.showToast('success', 'Project deleted');
      await this.loadProjects();
      this.renderProcessTable();
    } catch (error) {
      console.error('Error deleting project:', error);
      this.showToast('error', 'Failed to delete project');
    }
  }

  // Proje kaydet
  async saveProject(event) {
    event.preventDefault();
    
    const projectId = $('#projectId').val();
    const projectData = {
      name: $('#projectName').val(),
      description: $('#projectDescription').val(),
      processes: $('#processCheckboxes input:checked').map(function() {
        return $(this).val();
      }).get()
    };
    
    try {
      const method = projectId ? 'PUT' : 'POST';
      const url = projectId ? `/projects/${projectId}` : '/projects';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      
      if (response.ok) {
        this.showToast('success', `Project ${projectId ? 'updated' : 'created'}`);
        this.projectModal.hide();
        await this.loadProjects();
      } else {
        throw new Error('Failed to save project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      this.showToast('error', 'Failed to save project');
    }
  }

  // Proje seç
  selectProject(projectId) {
    if (this.currentProject?.id === projectId) {
      this.currentProject = null;
    } else {
      const project = this.projects.find(p => p.id === projectId);
      this.currentProject = project;
    }
    this.renderProjectList();
    this.renderProcessTable();
  }

  // Process başlat
  async startProcess(name) {
    try {
      await fetch(`/processes/${name}/start`, { method: 'PUT' });
      this.showToast('success', `Started process: ${name}`);
      await this.loadProcesses();
    } catch (error) {
      console.error('Error starting process:', error);
      this.showToast('error', `Failed to start process: ${name}`);
    }
  }

  // Process yeniden başlat
  async restartProcess(name) {
    try {
      await fetch(`/processes/${name}/restart`, { method: 'PUT' });
      this.showToast('success', `Restarted process: ${name}`);
      await this.loadProcesses();
    } catch (error) {
      console.error('Error restarting process:', error);
      this.showToast('error', `Failed to restart process: ${name}`);
    }
  }

  // Process durdur
  async stopProcess(name) {
    try {
      await fetch(`/processes/${name}/stop`, { method: 'PUT' });
      this.showToast('success', `Stopped process: ${name}`);
      await this.loadProcesses();
    } catch (error) {
      console.error('Error stopping process:', error);
      this.showToast('error', `Failed to stop process: ${name}`);
    }
  }
}

// Initialize the Process Manager when document is ready
$(() => new ProcessManager());
