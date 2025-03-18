/**
 * Başlangıç Yapılandırması
 * @author A. Kerem Gök
 * @description İlk çalıştırmada gerekli dizinleri ve varsayılan admin kullanıcısını oluşturur
 */

import { promises as fs } from 'fs';
import path from 'path';
import AuthService from '../services/AuthService';
import { UserRole } from '../models/User';

export async function initializeApp() {
  // Data dizinini oluştur
  const dataDir = path.join(__dirname, '../../data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }

  // Varsayılan admin kullanıcısını oluştur
  try {
    await AuthService.registerUser({
      username: 'admin',
      password: 'admin123', // İlk giriş sonrası değiştirilmeli
      role: UserRole.ADMIN
    });
    console.log('[Init] Default admin user created');
  } catch (error: any) {
    if (error.message === 'Username already exists') {
      console.log('[Init] Admin user already exists');
    } else {
      console.error('[Init] Failed to create admin user:', error);
    }
  }
}