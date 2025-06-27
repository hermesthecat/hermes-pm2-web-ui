/**
 * Proje Servis Sınıfı
 * @author A. Kerem Gök
 * @description PM2 projelerinin yönetimi için servis katmanı
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Project, CreateProjectDto, UpdateProjectDto } from '../models/Project';

/**
 * Proje yönetimi için servis sınıfı
 * @class ProjectService
 * @description Projelerin CRUD işlemleri ve dosya sistemi ile etkileşimini yönetir
 */
class ProjectService {
  /** Proje verilerinin saklanacağı JSON dosyasının yolu */
  private readonly dataFile: string;

  /** Projelerin bellek içi saklandığı Map veri yapısı */
  private projects: Map<string, Project>;

  /** Dosyaya yazma işlemi için gecikme zamanlayıcısı */
  private saveTimeout: NodeJS.Timeout | null = null;

  /** Dosyaya yazma gecikmesi (milisaniye) */
  private readonly SAVE_DELAY = 2000; // 2 saniye

  /**
   * ProjectService sınıfının yapıcı metodu
   * @constructor
   * @description Servis başlatılırken gerekli dosya yolunu ayarlar ve veriyi yükler
   */
  constructor() {
    this.dataFile = path.join(process.cwd(), 'data', 'projects.json');
    this.projects = new Map();
    this.initializeDataFile();
  }

  /**
   * Veri dosyasını başlatır veya yükler
   * @private
   * @async
   * @description Dosya sisteminde veri dosyasını oluşturur veya mevcut dosyayı okur
   */
  private async initializeDataFile() {
    try {
      // Data klasörünü oluştur
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });

      try {
        const data = await fs.readFile(this.dataFile, 'utf-8');
        const projects = JSON.parse(data) as Project[];
        this.projects = new Map(projects.map(p => [p.id, p]));
      } catch (error) {
        // Dosya yoksa veya bozuksa yeni oluştur
        await this.saveToFile();
      }
    } catch (error) {
      console.error('Error initializing project data:', error);
      throw error;
    }
  }

  /**
   * Projeleri dosyaya kaydeder
   * @private
   * @async
   * @description Bellek içindeki projeleri JSON formatında dosyaya yazar
   */
  private async saveToFile() {
    console.log('[ProjectService] Saving projects to file...');
    try {
      const projectsArray = Array.from(this.projects.values());
      await fs.writeFile(this.dataFile, JSON.stringify(projectsArray, null, 2));
      console.log('[ProjectService] Projects saved successfully.');
    } catch (error) {
      console.error('Error saving projects:', error);
    }
  }

  /**
   * Dosyaya kaydetme işlemini gecikmeli olarak zamanlar (debounce)
   * @private
   */
  private scheduleSave() {
    // Mevcut bir zamanlayıcı varsa temizle
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    // Yeni bir zamanlayıcı ayarla
    this.saveTimeout = setTimeout(() => {
      this.saveToFile();
    }, this.SAVE_DELAY);
  }

  /**
   * Tüm projeleri getirir
   * @async
   * @returns {Promise<Project[]>} Tüm projelerin listesi
   */
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  /**
   * ID'ye göre proje getirir
   * @async
   * @param {string} id - Projenin benzersiz tanımlayıcısı
   * @returns {Promise<Project | null>} Bulunan proje veya null
   */
  async getProjectById(id: string): Promise<Project | null> {
    return this.projects.get(id) || null;
  }

  /**
   * Yeni proje oluşturur
   * @async
   * @param {CreateProjectDto} dto - Yeni proje bilgileri
   * @returns {Promise<Project>} Oluşturulan proje
   */
  createProject(dto: CreateProjectDto): Project {
    const project: Project = {
      id: uuidv4(),
      name: dto.name,
      description: dto.description || '',
      processes: dto.processes || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.projects.set(project.id, project);
    this.scheduleSave();
    return project;
  }

  /**
   * Mevcut projeyi günceller
   * @async
   * @param {string} id - Güncellenecek projenin ID'si
   * @param {UpdateProjectDto} dto - Güncellenecek proje bilgileri
   * @returns {Promise<Project | null>} Güncellenmiş proje veya null
   */
  updateProject(id: string, dto: UpdateProjectDto): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;

    const updatedProject: Project = {
      ...project,
      name: dto.name || project.name,
      description: dto.description !== undefined ? dto.description : project.description,
      processes: dto.processes || project.processes,
      updatedAt: new Date()
    };

    this.projects.set(id, updatedProject);
    this.scheduleSave();
    return updatedProject;
  }

  /**
   * Projeyi siler
   * @async
   * @param {string} id - Silinecek projenin ID'si
   * @returns {Promise<boolean>} Silme işleminin başarılı olup olmadığı
   */
  deleteProject(id: string): boolean {
    const deleted = this.projects.delete(id);
    if (deleted) {
      this.scheduleSave();
    }
    return deleted;
  }

  /**
   * Projeye yeni süreç ekler
   * @async
   * @param {string} projectId - Sürecin ekleneceği projenin ID'si
   * @param {string} processName - Eklenecek sürecin adı
   * @returns {Promise<Project | null>} Güncellenmiş proje veya null
   */
  addProcessToProject(projectId: string, processName: string): Project | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    if (!project.processes.includes(processName)) {
      project.processes.push(processName);
      project.updatedAt = new Date();
      this.scheduleSave();
    }
    return project;
  }

  /**
   * Projeden süreç kaldırır
   * @async
   * @param {string} projectId - Sürecin kaldırılacağı projenin ID'si
   * @param {string} processName - Kaldırılacak sürecin adı
   * @returns {Promise<Project | null>} Güncellenmiş proje veya null
   */
  removeProcessFromProject(projectId: string, processName: string): Project | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    project.processes = project.processes.filter(p => p !== processName);
    project.updatedAt = new Date();
    this.scheduleSave();
    return project;
  }

  /**
   * Süreç adına göre projeyi bulur
   * @async
   * @param {string} processName - Aranacak sürecin adı
   * @returns {Promise<Project | null>} Bulunan proje veya null
   * @description Belirtilen sürecin hangi projeye ait olduğunu bulur
   */
  async getProjectByProcessName(processName: string): Promise<Project | null> {
    for (const project of this.projects.values()) {
      if (project.processes.includes(processName)) {
        return project;
      }
    }
    return null;
  }
}

export default new ProjectService();
