/**
 * Proje Model Tanımlamaları
 * @author A. Kerem Gök
 * @description PM2 projelerinin tip tanımlamaları
 */

/**
 * Proje Arayüzü
 * @interface Project
 * @description Bir PM2 projesinin temel özelliklerini tanımlar
 */
export interface Project {
  /** Benzersiz proje tanımlayıcısı */
  id: string;

  /** Proje adı */
  name: string;

  /** Proje açıklaması (opsiyonel) */
  description?: string;

  /** Projeye ait PM2 süreçlerinin adları */
  processes: string[];  // Process adları

  /** Projenin oluşturulma tarihi */
  createdAt: Date;

  /** Projenin son güncellenme tarihi */
  updatedAt: Date;
}

/**
 * Proje Oluşturma Veri Transfer Nesnesi
 * @interface CreateProjectDto
 * @description Yeni bir proje oluştururken kullanılacak veri yapısı
 */
export interface CreateProjectDto {
  /** Proje adı */
  name: string;

  /** Proje açıklaması (opsiyonel) */
  description?: string;

  /** Projeye eklenecek PM2 süreçlerinin adları (opsiyonel) */
  processes?: string[];
}

/**
 * Proje Güncelleme Veri Transfer Nesnesi
 * @interface UpdateProjectDto
 * @description Mevcut bir projeyi güncellerken kullanılacak veri yapısı
 */
export interface UpdateProjectDto {
  /** Yeni proje adı (opsiyonel) */
  name?: string;

  /** Yeni proje açıklaması (opsiyonel) */
  description?: string;

  /** Güncellenecek PM2 süreç listesi (opsiyonel) */
  processes?: string[];
}
