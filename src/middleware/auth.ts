/**
 * Kimlik Doğrulama Middleware'i
 * @author A. Kerem Gök
 * @description API endpoint'lerini korumak için kullanılan middleware
 */

import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService';
import { UserRole } from '../models/User';

// Request nesnesine user özelliğini ekle
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: UserRole;
      };
    }
  }
}

/**
 * JWT token doğrulama middleware'i
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const user = AuthService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

/**
 * Admin rolü kontrolü middleware'i
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Admin privileges required' });
  }

  next();
};