/**
 * Hız Sınırlayıcı Middleware
 * @author A. Kerem Gök
 * @description Brute force saldırılarına karşı koruma sağlar
 */

import rateLimit from 'express-rate-limit';

// Genel API istekleri için sınırlayıcı
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına maksimum istek sayısı
  message: 'Too many requests from this IP, please try again later'
});

// Kimlik doğrulama istekleri için daha sıkı sınırlayıcı
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // IP başına maksimum başarısız giriş denemesi
  message: 'Too many login attempts from this IP, please try again later',
  standardHeaders: true, // Limit bilgilerini Return-* header'larında gönder
  legacyHeaders: false, // X-RateLimit-* header'larını devre dışı bırak
});