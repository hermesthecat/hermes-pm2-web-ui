import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import pm2Lib from './pm2Lib';
import ProjectService from './services/ProjectService';
import { CreateProjectDto, UpdateProjectDto } from './models/Project';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Process endpoints
app.get('/processes', async (req, res) => {
  try {
    const processes = await pm2Lib.getProcesses();
    res.json(processes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get processes' });
  }
});

app.put('/processes/:name/:action', async (req, res) => {
  const { name, action } = req.params;
  try {
    let result;
    switch (action) {
      case 'start':
        result = await pm2Lib.startProcess(name);
        break;
      case 'stop':
        result = await pm2Lib.stopProcess(name);
        break;
      case 'restart':
        result = await pm2Lib.restartProcess(name);
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: `Failed to ${action} process` });
  }
});

// Project endpoints
app.get('/projects', async (req, res) => {
  try {
    const projects = await ProjectService.getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get projects' });
  }
});

app.get('/projects/:id', async (req, res) => {
  try {
    const project = await ProjectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get project' });
  }
});

app.post('/projects', async (req, res) => {
  try {
    const dto: CreateProjectDto = req.body;
    const project = await ProjectService.createProject(dto);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create project' });
  }
});

app.put('/projects/:id', async (req, res) => {
  try {
    const dto: UpdateProjectDto = req.body;
    const project = await ProjectService.updateProject(req.params.id, dto);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update project' });
  }
});

app.delete('/projects/:id', async (req, res) => {
  try {
    const deleted = await ProjectService.deleteProject(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

app.post('/projects/:id/processes/:processName', async (req, res) => {
  try {
    const project = await ProjectService.addProcessToProject(req.params.id, req.params.processName);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add process to project' });
  }
});

app.delete('/projects/:id/processes/:processName', async (req, res) => {
  try {
    const project = await ProjectService.removeProcessFromProject(req.params.id, req.params.processName);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove process from project' });
  }
});

// Socket.IO setup
io.on('connection', (socket) => {
  pm2Lib.onLogOut((log) => {
    socket.emit(`${log.process.name}:out_log`, log);
    socket.emit('log:out', log);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`[Server] Listening on :${PORT}`);
});
