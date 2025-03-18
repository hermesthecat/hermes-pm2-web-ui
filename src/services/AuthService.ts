/**
 * Kimlik Doğrulama Servisi
 * @author A. Kerem Gök
 * @description Kullanıcı kimlik doğrulama ve yetkilendirme işlemleri
 */

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, UserRole, CreateUserDto, UpdateUserDto, LoginUserDto, ChangePasswordDto } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

class AuthService {
  private users: User[] = [];
  private readonly dataPath: string;

  constructor() {
    this.dataPath = path.join(__dirname, '../../data/users.json');
    this.initializeDataFile();
  }

  /**
   * Veri dosyasını başlat
   */
  private async initializeDataFile() {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      this.users = JSON.parse(data);
    } catch (error) {
      // Dosya yoksa boş bir dizi ile başlat
      this.users = [];
      await this.saveToFile();
    }
  }

  /**
   * Kullanıcıları dosyaya kaydet
   */
  private async saveToFile() {
    await fs.writeFile(this.dataPath, JSON.stringify(this.users, null, 2));
  }

  /**
   * Yeni kullanıcı oluştur
   */
  async registerUser(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    // Kullanıcı adının benzersiz olduğunu kontrol et
    if (this.users.some(user => user.username === dto.username)) {
      throw new Error('Username already exists');
    }

    // Parolayı şifrele
    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // Yeni kullanıcı oluştur
    const newUser: User = {
      id: uuidv4(),
      username: dto.username,
      password: hashedPassword,
      role: dto.role || UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.push(newUser);
    await this.saveToFile();

    // Parolayı çıkararak kullanıcı bilgilerini döndür
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  /**
   * Kullanıcı girişi
   */
  async loginUser(dto: LoginUserDto): Promise<{ token: string; user: Omit<User, 'password'> }> {
    // Kullanıcıyı bul
    const user = this.users.find(u => u.username === dto.username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Parolayı kontrol et
    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // JWT token oluştur
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Parolayı çıkararak kullanıcı bilgilerini döndür
    const { password, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  /**
   * Parola değiştir
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<boolean> {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Mevcut parolayı kontrol et
    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Yeni parolayı şifrele
    user.password = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    user.updatedAt = new Date();

    await this.saveToFile();
    return true;
  }

  /**
   * Kullanıcı rol güncelleme (sadece admin)
   */
  async updateUserRole(adminId: string, userId: string, role: UserRole): Promise<Omit<User, 'password'>> {
    // Admin kullanıcıyı kontrol et
    const admin = this.users.find(u => u.id === adminId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new Error('Unauthorized');
    }

    // Güncellenecek kullanıcıyı bul
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Rolü güncelle
    user.role = role;
    user.updatedAt = new Date();

    await this.saveToFile();

    // Parolayı çıkararak kullanıcı bilgilerini döndür
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * JWT token doğrulama
   */
  verifyToken(token: string): { userId: string; username: string; role: UserRole } {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: UserRole };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

export default new AuthService();