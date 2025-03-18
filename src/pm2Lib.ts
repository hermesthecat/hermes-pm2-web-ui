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
      const list = await promisify<ProcessDescription[]>(pm2.list).call(pm2);
      return list || [];
    } catch (error) {
      console.error('Error getting PM2 processes:', error);
      return [];
    }
  }

  async startProcess(processName: string): Promise<Proc> {
    try {
      const processes = await this.getProcesses();
      const existingProcess = processes.find(p => p.name === processName);

      if (existingProcess) {
        return await promisify<string, Proc>(pm2.start).call(pm2, processName);
      } else {
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
        console.log('PM2 Bus launched');
      }

      // Tüm log olaylarını dinle
      ['log:out', 'log:err'].forEach(event => {
        this.bus?.on(event, (data: any) => {
          if (data && data.process) {
            onLog({
              data: event === 'log:err' ? `[ERROR] ${data.data}` : data.data,
              at: Date.now(),
              process: {
                namespace: data.process.namespace || '',
                rev: data.process.rev || '',
                name: data.process.name || '',
                pm_id: data.process.pm_id || 0
              }
            });
          }
        });
      });

      // Process olaylarını dinle
      this.bus.on('process:event', (data: any) => {
        if (data && data.process) {
          onLog({
            data: `[STATUS] Process ${data.process.name} is ${data.event}`,
            at: Date.now(),
            process: {
              namespace: data.process.namespace || '',
              rev: data.process.rev || '',
              name: data.process.name || '',
              pm_id: data.process.pm_id || 0
            }
          });
        }
      });

    } catch (error) {
      console.error('Error setting up PM2 bus:', error);
      throw error;
    }
  }

  private getStartOptions(processName: string): StartOptions {
    const scriptPath = this.SCRIPT_PATH ? `${this.SCRIPT_PATH}/${processName}` : processName;
    const alias = processName.replace(/\.[^/.]+$/, '');

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
