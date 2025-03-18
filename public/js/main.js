// Process Manager UI Controller
class ProcessManager {
  constructor() {
    this.socket = io();
    this.initializeEventListeners();
    this.startAutoRefresh();
  }

  // Initialize all event listeners
  initializeEventListeners() {
    $(document).on('click', 'button[data-action]', (e) => this.handleActionButton(e));
    $('#clear-console').on('click', () => this.clearConsole());
    $('#show-all-logs').on('click', () => this.showStdLog());
  }

  // Start auto-refresh for process status
  startAutoRefresh() {
    this.updateProcessesStatus();
    setInterval(() => this.updateProcessesStatus(), 15000);
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

  // Update processes table
  async updateProcessesStatus() {
    try {
      const response = await fetch('/processes');
      if (!response.ok) throw new Error('Failed to fetch processes');
      
      const processes = await response.json();
      const rows = processes.map(process => `
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
      $console.append(`
        <p id="console-text">
          <span class="log-timestamp">[${timestamp}]</span>
          <span class="process-name">[${procLog.process.name}]</span>
          ${this.escapeHtml(procLog.data)}
        </p>
      `);
      this.scrollConsoleToBottom();
    };

    if (process) {
      // Tek process için log dinleme
      this.socket.on(`${process}:out_log`, logHandler);
      this.socket.on(`${process}:err_log`, (procLog) => {
        logHandler({
          ...procLog,
          data: `[ERROR] ${procLog.data}`
        });
      });
    } else {
      // Tüm process'lerin loglarını dinleme
      this.socket.on('log:out', logHandler);
      this.socket.on('log:err', (procLog) => {
        logHandler({
          ...procLog,
          data: `[ERROR] ${procLog.data}`
        });
      });
    }
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
