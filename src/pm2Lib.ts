import pm2, { Proc, ProcessDescription, StartOptions } from 'pm2';
import { promisify } from 'util';
import { EventEmitter } from 'events';

export interface IProcessOutLog {
  data: string;
  at: number;
  process: {
    namespace: string;
    rev: string;
    name: string;
    pm_id: number;
  };
}

class Pm2Lib {
  private readonly SCRIPT_PATH = process.env.SCRIPT_PATH;
  private bus: EventEmitter | undefined;

  async getProcesses(): Promise<ProcessDescription[]> {
    try {
      // PM2'deki tüm process'leri al
      const list = await promisify<ProcessDescription[]>(pm2.list).call(pm2);
      return list || [];
    } catch (error) {
      console.error('Error getting PM2 processes:', error);
      return [];
    }
  }

  async startProcess(processName: string): Promise<Proc> {
    try {
      // Önce process'in var olup olmadığını kontrol et
      const processes = await this.getProcesses();
      const existingProcess = processes.find(p => p.name === processName);
      
      if (existingProcess) {
        // Process zaten PM2'de kayıtlı, başlat
        return await promisify<string, Proc>(pm2.start).call(pm2, processName);
      } else {
        // Process PM2'de kayıtlı değil, yeni başlat
        const startOptions = this.getStartOptions(processName);
        return await promisify<StartOptions, Proc>(pm2.start).call(pm2, startOptions);
      }
    } catch (error) {
      console.error(`Error starting process ${processName}:`, error);
      throw error;
    }
  }

  async restartProcess(processName: string): Promise<Proc> {
    try {
      return promisify(pm2.restart).call(pm2, processName);
    } catch (error) {
      console.error(`Error restarting process ${processName}:`, error);
      throw error;
    }
  }

  async stopProcess(processName: string): Promise<Proc> {
    try {
      return promisify(pm2.stop).call(pm2, processName);
    } catch (error) {
      console.error(`Error stopping process ${processName}:`, error);
      throw error;
    }
  }

  async onLogOut(onLog: (logObj: IProcessOutLog) => void) {
    try {
      if (!this.bus) {
        this.bus = await promisify<EventEmitter>(pm2.launchBus).call(pm2);
      }
      
      // Tüm process'lerin loglarını dinle
      this.bus.on('log:out', (procLog: IProcessOutLog) => {
        onLog(procLog);
      });

      // Hata loglarını da dinle
      this.bus.on('log:err', (procLog: IProcessOutLog) => {
        onLog({
          ...procLog,
          data: `[ERROR] ${procLog.data}`
        });
      });

      // Process durumu değişikliklerini dinle
      this.bus.on('process:event', (data: any) => {
        console.log('Process event:', data);
      });
    } catch (error) {
      console.error('Error setting up PM2 bus:', error);
      throw error;
    }
  }

  private getStartOptions(processName: string): StartOptions {
    const scriptPath = this.SCRIPT_PATH ? `${this.SCRIPT_PATH}/${processName}` : processName;
    const alias = processName.replace(/\.[^/.]+$/, ''); // Uzantıyı kaldır

    return {
      script: scriptPath,
      name: processName,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      output: this.SCRIPT_PATH ? `${this.SCRIPT_PATH}/${alias}.stdout.log` : `${alias}.stdout.log`,
      error: this.SCRIPT_PATH ? `${this.SCRIPT_PATH}/${alias}.stderr.log` : `${alias}.stderr.log`,
      exec_mode: 'fork',
    };
  }
}

export default new Pm2Lib();
