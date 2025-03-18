import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Project, CreateProjectDto, UpdateProjectDto } from '../models/Project';

class ProjectService {
  private readonly dataFile: string;
  private projects: Map<string, Project>;

  constructor() {
    this.dataFile = path.join(process.cwd(), 'data', 'projects.json');
    this.projects = new Map();
    this.initializeDataFile();
  }

  private async initializeDataFile() {
    try {
      // data klasörünü oluştur
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

  private async saveToFile() {
    try {
      const projectsArray = Array.from(this.projects.values());
      await fs.writeFile(this.dataFile, JSON.stringify(projectsArray, null, 2));
    } catch (error) {
      console.error('Error saving projects:', error);
      throw error;
    }
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProjectById(id: string): Promise<Project | null> {
    return this.projects.get(id) || null;
  }

  async createProject(dto: CreateProjectDto): Promise<Project> {
    const project: Project = {
      id: uuidv4(),
      name: dto.name,
      description: dto.description || '',
      processes: dto.processes || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.projects.set(project.id, project);
    await this.saveToFile();
    return project;
  }

  async updateProject(id: string, dto: UpdateProjectDto): Promise<Project | null> {
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
    await this.saveToFile();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    const deleted = this.projects.delete(id);
    if (deleted) {
      await this.saveToFile();
    }
    return deleted;
  }

  async addProcessToProject(projectId: string, processName: string): Promise<Project | null> {
    const project = this.projects.get(projectId);
    if (!project) return null;

    if (!project.processes.includes(processName)) {
      project.processes.push(processName);
      project.updatedAt = new Date();
      await this.saveToFile();
    }
    return project;
  }

  async removeProcessFromProject(projectId: string, processName: string): Promise<Project | null> {
    const project = this.projects.get(projectId);
    if (!project) return null;

    project.processes = project.processes.filter(p => p !== processName);
    project.updatedAt = new Date();
    await this.saveToFile();
    return project;
  }

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
