/**
 * Socket.IO Yönetim Sınıfı
 * @author A. Kerem Gök
 * @description Gerçek zamanlı iletişim için Socket.IO sunucu yapılandırması
 */

import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import pm2Lib, { IProcessOutLog } from "./pm2Lib";

/**
 * Socket.IO Yönetici Sınıfı
 * @class SocketIO
 * @description PM2 süreçlerinden gelen logları gerçek zamanlı olarak istemcilere iletir
 */
class SocketIO {
  /** Socket.IO sunucu örneği */
  private io: Server | undefined;

  /**
   * Socket.IO sunucusunu başlatır
   * @param {HttpServer} httpServer - HTTP sunucu örneği
   * @throws {Error} Socket sunucusu zaten tanımlıysa hata fırlatır
   * @description HTTP sunucusu üzerinde Socket.IO'yu yapılandırır ve log dinleyicilerini başlatır
   */
  init(httpServer: HttpServer) {
    if (this.io !== undefined) {
      throw new Error('Socket server already defined!');
    }

    this.io = new Server(httpServer);

    // PM2 log olaylarını dinle ve ilgili istemcilere ilet
    pm2Lib.onLogOut((procLog: IProcessOutLog) => {
      this.io?.emit(`${procLog.process.name}:out_log`, procLog);
    });
  }
}

// Singleton örneği oluştur ve dışa aktar
export default new SocketIO();
