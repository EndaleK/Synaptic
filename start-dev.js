#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Starting Flashcard Generator Development Server...\n');

// Function to check if port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, '127.0.0.1');
    
    server.on('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Find available port
async function findAvailablePort(startPort = 3000) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await checkPort(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Start Next.js server
async function startServer() {
  try {
    const port = await findAvailablePort(3456);
    console.log(`✅ Found available port: ${port}`);
    
    console.log('📦 Starting Next.js server...\n');
    
    // Use exec instead of spawn for better process handling
    const { exec } = require('child_process');
    
    const command = `npx next dev -p ${port}`;
    const nextProcess = exec(command, {
      env: { ...process.env, NODE_ENV: 'development' }
    });

    let serverReady = false;

    nextProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
      if (data.includes('Ready')) {
        serverReady = true;
        console.log(`\n🎉 Server is ready at: http://localhost:${port}\n`);
        console.log('📱 Open your browser and navigate to the URL above.\n');
        
        // Keep checking if server is still alive
        setInterval(() => {
          http.get(`http://localhost:${port}`, (res) => {
            // Server is alive
          }).on('error', () => {
            console.error('❌ Server appears to be down. Please restart.');
            process.exit(1);
          });
        }, 5000);
      }
    });

    nextProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    nextProcess.on('close', (code) => {
      console.log(`\n❌ Next.js process exited with code ${code}`);
      process.exit(code);
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      nextProcess.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Kill any existing Next.js processes first
console.log('🧹 Cleaning up any existing processes...');
const cleanup = spawn('pkill', ['-f', 'next dev'], { stdio: 'inherit' });

cleanup.on('close', () => {
  setTimeout(() => {
    startServer();
  }, 1000);
});

cleanup.on('error', () => {
  // pkill might not exist or no processes to kill - that's ok
  startServer();
});