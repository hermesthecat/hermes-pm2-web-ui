import express from 'express';
import pm2Lib from './pm2Lib';
import socketIO from './socketIO';

// PM2 hata tipi tanımı
interface PM2Error {
  message: string;
  [key: string]: any;
}

const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.get('/processes', async (req, res) => {
  try {
    res.json(await pm2Lib.getProcesses());
  } catch (error) {
    const pm2Error = error as PM2Error;
    res.status(500).json({ message: pm2Error.message || 'Failed to get processes' });
  }
});

app.put('/processes/:filename/:action(start|restart|stop)', async (req, res) => {
  try {
    const { filename, action } = req.params;

    switch (action) {
      case 'start':
        res.json(await pm2Lib.startProcess(filename));
        break;
      case 'restart':
        res.json(await pm2Lib.restartProcess(filename));
        break;
      case 'stop':
        res.json(await pm2Lib.stopProcess(filename));
        break;
      default:
        return res.status(400).json({ message: `${action} is not supported!` });
    }
  } catch (error) {
    const pm2Error = error as PM2Error;
    res.status(500).json({ 
      message: Array.isArray(pm2Error) 
        ? pm2Error[0]?.message || 'Unknown error' 
        : pm2Error.message || 'Unknown error' 
    });
  }
});

const PORT = process.env.PORT || 3000;

const httpServer = app.listen(PORT, () => {
  console.log(`[Server] Listening on :${PORT}`);
});

socketIO.init(httpServer);
