require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db');
const voteRoutes = require('./routes/votes');
const { router: authRoutes } = require('./routes/auth');

const app = express();
const server = http.createServer(app);

// Enable Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Allows any origin in development
    methods: ["GET", "POST"]
  }
});
app.set('io', io); // Make io available in routes

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/vote', limiter);
app.use('/auth', limiter);

// Routes
app.use('/', authRoutes);
app.use('/', voteRoutes);

const path = require('path');

// Page routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../voter_login.html'));
});

app.get('/vote', (req, res) => {
  res.sendFile(path.join(__dirname, '../tamil_nadu_election_poll.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin_login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard.html'));
});

const PORT = process.env.PORT || 3000;

// Kill process occupying a port (Windows)
function killPort(port) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`netstat -ano | findstr :${port} | findstr LISTENING`, (err, stdout) => {
      if (err || !stdout.trim()) return resolve();
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') pids.add(pid);
      });
      if (pids.size === 0) return resolve();
      let killed = 0;
      pids.forEach(pid => {
        exec(`taskkill /PID ${pid} /F`, () => {
          killed++;
          if (killed === pids.size) setTimeout(resolve, 500);
        });
      });
    });
  });
}

// Connect to Database and start server with auto-recovery
connectDB().then(() => {
  server.on('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠ Port ${PORT} is busy — killing old process and retrying...`);
      await killPort(PORT);
      server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
