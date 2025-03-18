/**
 * Kullanıcı Model Tanımlamaları
 * @author A. Kerem Gök
 * @description Kullanıcı yönetimi için tip tanımlamaları
 */

/**
 * Kullanıcı Rolleri
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

/**
 * Kullanıcı Arayüzü
 * @interface User
 * @description Bir kullanıcının temel özelliklerini tanımlar
 */
export interface User {
  /** Benzersiz kullanıcı tanımlayıcısı */
  id: string;

  /** Kullanıcı adı */
  username: string;

  /** Şifrelenmiş parola */
  password: string;

  /** Kullanıcı rolü */
  role: UserRole;

  /** Kullanıcının oluşturulma tarihi */
  createdAt: Date;

  /** Kullanıcının son güncellenme tarihi */
  updatedAt: Date;
}

/**
 * Kullanıcı Oluşturma Veri Transfer Nesnesi
 * @interface CreateUserDto
 * @description Yeni bir kullanıcı oluştururken kullanılacak veri yapısı
 */
export interface CreateUserDto {
  /** Kullanıcı adı */
  username: string;

  /** Parola */
  password: string;

  /** Kullanıcı rolü (opsiyonel, varsayılan: USER) */
  role?: UserRole;
}

/**
 * Kullanıcı Güncelleme Veri Transfer Nesnesi
 * @interface UpdateUserDto
 * @description Mevcut bir kullanıcıyı güncellerken kullanılacak veri yapısı
 */
export interface UpdateUserDto {
  /** Yeni kullanıcı adı (opsiyonel) */
  username?: string;

  /** Yeni parola (opsiyonel) */
  password?: string;

  /** Yeni rol (opsiyonel) */
  role?: UserRole;
}

/**
 * Kullanıcı Giriş Veri Transfer Nesnesi
 * @interface LoginUserDto
 * @description Kullanıcı girişi için kullanılacak veri yapısı
 */
export interface LoginUserDto {
  /** Kullanıcı adı */
  username: string;

  /** Parola */
  password: string;
}

/**
 * Parola Değiştirme Veri Transfer Nesnesi
 * @interface ChangePasswordDto
 * @description Parola değiştirme için kullanılacak veri yapısı
 */
export interface ChangePasswordDto {
  /** Mevcut parola */
  currentPassword: string;

  /** Yeni parola */
  newPassword: string;
}