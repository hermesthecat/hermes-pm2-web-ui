// Process Manager UI Controller
class ProcessManager {
  constructor() {
    this.socket = io();
    this.projectModal = new bootstrap.Modal(document.getElementById('projectModal'));
    this.currentProject = null;
    this.initializeEventListeners();
    this.startAutoRefresh();
    this.loadProjects();
  }

  // Initialize all event listeners
  initializeEventListeners() {
    $(document).on('click', 'button[data-action]', (e) => this.handleActionButton(e));
    $('#clear-console').on('click', () => this.clearConsole());
    $('#show-all-logs').on('click', () => this.showStdLog());
    $('#new-project').on('click', () => this.showProjectModal());
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
      const projects = await response.json();
      this.renderProjects(projects);
    } catch (error) {
      this.showToast('error', 'Failed to load projects');
    }
  }

  // Render projects in sidebar
  renderProjects(projects) {
    const projectList = $('#project-list');
    projectList.empty();
    
    projects.forEach(project => {
      projectList.append(`
        <li class="nav-item">
          <div class="nav-link project-item d-flex justify-content-between align-items-center" 
               data-id="${project.id}">
            <span class="project-name">${project.name}</span>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary btn-sm edit-project">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm delete-project">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </li>
      `);
    });
  }

  // Show project modal for create/edit
  async showProjectModal(project = null) {
    const modal = $('#projectModal');
    modal.find('#projectId').val(project?.id || '');
    modal.find('#projectName').val(project?.name || '');
    modal.find('#projectDescription').val(project?.description || '');

    // Process checkboxes oluştur
    const processes = await this.getProcesses();
    const checkboxes = processes.map(proc => `
      <label class="list-group-item">
        <input class="form-check-input me-1" type="checkbox" value="${proc.name}"
          ${project?.processes.includes(proc.name) ? 'checked' : ''}>
        ${proc.name}
      </label>
    `);
    $('#processCheckboxes').html(checkboxes.join(''));

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
        $('.project-item').removeClass('active');
        await this.updateProcessesStatus(); // Show all processes
        return;
      }

      const response = await fetch(`/projects/${projectId}`);
      const project = await response.json();
      
      this.currentProject = projectId;
      $('.project-item').removeClass('active');
      $(`.project-item[data-id="${projectId}"]`).addClass('active');
      
      await this.updateProcessesStatus(project.processes);
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
    const $console = $('#console');
    $console.empty();
    this.socket.removeAllListeners();

    const logHandler = (procLog) => {
      const timestamp = new Date().toLocaleTimeString();
      const logClass = procLog.data.startsWith('[ERROR]') ? 'text-danger' : 
                      procLog.data.startsWith('[STATUS]') ? 'text-info' : '';
      
      $console.append(`
        <p id="console-text" class="${logClass}">
          <span class="log-timestamp">[${timestamp}]</span>
          <span class="process-name">[${procLog.process.name}]</span>
          ${this.escapeHtml(procLog.data)}
        </p>
      `);
      this.scrollConsoleToBottom();
    };

    if (process) {
      // Tek process için log dinleme
      this.socket.on('log:*', (procLog) => {
        if (procLog.process.name === process) {
          logHandler(procLog);
        }
      });
    } else {
      // Tüm process'lerin loglarını dinleme
      this.socket.on('log:*', logHandler);
    }

    // Process olaylarını dinle
    this.socket.on('process:*', logHandler);
  }

  // Clear console output
  clearConsole() {
    $('#console').empty();
  }

  // Scroll console to bottom
  scrollConsoleToBottom() {
    const $consoleBackground = $('#console-background');
    $consoleBackground.animate({ scrollTop: $consoleBackground[0].scrollHeight }, 200);
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
}

// Initialize the Process Manager when document is ready
$(() => new ProcessManager());
