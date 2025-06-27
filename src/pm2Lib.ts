/**
 * PM2 Kütüphane Sarmalayıcı
 * @author A. Kerem Gök
 * @description PM2 süreç yöneticisi ile etkileşim için yardımcı sınıf
 */

import pm2, { Proc, ProcessDescription, StartOptions } from 'pm2';
import { promisify } from 'util';
import { EventEmitter } from 'events';

/**
 * Süreç Log Çıktısı Arayüzü
 * @interface IProcessOutLog
 * @description PM2 süreçlerinden gelen log mesajlarının yapısı
 */
export interface IProcessOutLog {
  /** Log mesajının içeriği */
  data: string;

  /** Log mesajının zamanı (timestamp) */
  at: number;

  /** Süreç bilgileri */
  process: {
    /** Sürecin isim alanı */
    namespace: string;

    /** Süreç revizyonu */
    rev: string;

    /** Süreç adı */
    name: string;

    /** PM2 süreç ID'si */
    pm_id: number;
  };
}

/**
 * PM2 Yönetim Sınıfı
 * @class Pm2Lib
 * @description PM2 süreçlerinin yönetimi için yardımcı metodlar sağlar ve olayları yayınlar
 */
class Pm2Lib extends EventEmitter {
  /** Süreç betiklerinin bulunduğu dizin yolu */
  private readonly SCRIPT_PATH = process.env.SCRIPT_PATH;

  /** PM2 olay yayıncısı */
  private bus: EventEmitter | undefined;

  /**
   * PM2 olay veriyolunu başlatır ve olayları dinler
   * @async
   */
  async init() {
    if (this.bus) {
      return;
    }

    try {
      this.bus = await promisify<EventEmitter>(pm2.launchBus).call(pm2);
      console.log('[PM2-Lib] PM2 Bus launched successfully.');

      // Tüm log olaylarını dinle ve 'log' olayı olarak yayınla
      ['log:out', 'log:err'].forEach(event => {
        this.bus?.on(event, (data: any) => {
          if (data && data.process) {
            const logEntry: IProcessOutLog = {
              data: event === 'log:err' ? `[ERROR] ${data.data}` : data.data,
              at: Date.now(),
              process: {
                namespace: data.process.namespace || '',
                rev: data.process.rev || '',
                name: data.process.name || '',
                pm_id: data.process.pm_id || 0
              }
            };
            this.emit('log', logEntry);
          }
        });
      });

      // Süreç durum değişikliklerini dinle ve 'status_change' olayı olarak yayınla
      this.bus.on('process:event', (data: any) => {
        if (data && data.process) {
          // Durum değişikliğini log olarak da yayınla
          const logEntry: IProcessOutLog = {
            data: `[STATUS] Process ${data.process.name} is now ${data.event}`,
            at: Date.now(),
            process: {
              namespace: data.process.namespace || '',
              rev: data.process.rev || '',
              name: data.process.name || '',
              pm_id: data.process.pm_id || 0
            }
          };
          this.emit('log', logEntry);

          // Arayüzü güncellemek için durum değişikliği olayını yayınla
          this.emit('status_change', { name: data.process.name, event: data.event });
        }
      });

    } catch (error) {
      console.error('[PM2-Lib] Error launching PM2 bus:', error);
      throw error;
    }
  }

  /**
   * Tüm PM2 süreçlerini listeler
   * @async
   * @returns {Promise<ProcessDescription[]>} PM2 süreçlerinin listesi
   */
  async getProcesses(): Promise<ProcessDescription[]> {
    try {
      const list = await promisify<ProcessDescription[]>(pm2.list).call(pm2);
      return list || [];
    } catch (error) {
      console.error('Error getting PM2 processes:', error);
      return [];
    }
  }

  /**
   * Belirtilen süreci başlatır. Mevcut bir süreç adı veya yeni bir süreç için başlangıç seçenekleri alabilir.
   * @async
   * @param {string | StartOptions} processNameOrOptions - Başlatılacak sürecin adı veya başlangıç seçenekleri
   * @returns {Promise<Proc>} Başlatılan süreç bilgisi
   */
  async startProcess(processNameOrOptions: string | StartOptions): Promise<Proc> {
    try {
      if (typeof processNameOrOptions === 'string') {
        const processName = processNameOrOptions;
        const processes = await this.getProcesses();
        const existingProcess = processes.find(p => p.name === processName);

        if (existingProcess) {
          console.log(`[PM2-Lib] Starting existing process: ${processName}`);
          return await promisify<string, Proc>(pm2.start).call(pm2, processName);
        } else {
          console.log(`[PM2-Lib] Starting new process with default options for: ${processName}`);
          const startOptions = this.getStartOptions(processName);
          return await promisify<StartOptions, Proc>(pm2.start).call(pm2, startOptions);
        }
      } else {
        const options = processNameOrOptions;
        console.log(`[PM2-Lib] Starting new process with provided options: ${options.name}`);
        return await promisify<StartOptions, Proc>(pm2.start).call(pm2, options);
      }
    } catch (error) {
      const target = typeof processNameOrOptions === 'string' ? processNameOrOptions : processNameOrOptions.name;
      console.error(`Error starting process ${target}:`, error);
      throw error;
    }
  }

  /**
   * Belirtilen süreci yeniden başlatır
   * @async
   * @param {string} processName - Yeniden başlatılacak sürecin adı
   * @returns {Promise<Proc>} Yeniden başlatılan süreç bilgisi
   */
  async restartProcess(processName: string): Promise<Proc> {
    try {
      return promisify(pm2.restart).call(pm2, processName);
    } catch (error) {
      console.error(`Error restarting process ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Belirtilen süreci durdurur
   * @async
   * @param {string} processName - Durdurulacak sürecin adı
   * @returns {Promise<Proc>} Durdurulan süreç bilgisi
   */
  async stopProcess(processName: string): Promise<Proc> {
    try {
      return promisify(pm2.stop).call(pm2, processName);
    } catch (error) {
      console.error(`Error stopping process ${processName}:`, error);
      throw error;
    }
  }

  /**
   * Süreç başlatma seçeneklerini oluşturur
   * @private
   * @param {string} processName - Süreç adı
   * @returns {StartOptions} PM2 başlatma seçenekleri
   * @description Süreç için gerekli log dosyası yolları ve çalıştırma modunu ayarlar
   */
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
