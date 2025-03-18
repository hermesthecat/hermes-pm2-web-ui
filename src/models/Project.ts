export interface Project {
  id: string;
  name: string;
  description?: string;
  processes: string[];  // Process adları
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  processes?: string[];
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  processes?: string[];
}
