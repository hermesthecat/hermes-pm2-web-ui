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
 * @description PM2 süreçlerinin yönetimi için yardımcı metodlar sağlar
 */
class Pm2Lib {
  /** Süreç betiklerinin bulunduğu dizin yolu */
  private readonly SCRIPT_PATH = process.env.SCRIPT_PATH;

  /** PM2 olay yayıncısı */
  private bus: EventEmitter | undefined;

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
   * Belirtilen süreci başlatır
   * @async
   * @param {string} processName - Başlatılacak sürecin adı
   * @returns {Promise<Proc>} Başlatılan süreç bilgisi
   */
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
   * PM2 log olaylarını dinlemeye başlar
   * @async
   * @param {Function} onLog - Log olayı gerçekleştiğinde çağrılacak fonksiyon
   * @description PM2 süreçlerinden gelen tüm logları ve durum değişikliklerini dinler
   */
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

      // Süreç durum değişikliklerini dinle
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
