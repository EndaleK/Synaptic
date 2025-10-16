const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Flashcard Generator with Proxy Server...');

// Kill any existing processes
const killCommand = spawn('pkill', ['-f', 'next dev'], { stdio: 'inherit' });

killCommand.on('close', () => {
  setTimeout(() => {
    // Start Next.js in background
    console.log('📦 Starting Next.js server...');
    const nextProcess = spawn('npm', ['run', 'dev', '--', '--port', '9000'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'development' }
    });

    let nextReady = false;

    nextProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Next.js:', output.trim());
      if (output.includes('Ready')) {
        nextReady = true;
        console.log('✅ Next.js is ready!');
      }
    });

    nextProcess.stderr.on('data', (data) => {
      console.log('Next.js Error:', data.toString().trim());
    });

    // Create proxy server
    const proxyServer = http.createServer((req, res) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

      if (!nextReady) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Starting Flashcard Generator...</title>
            <meta http-equiv="refresh" content="2">
          </head>
          <body style="font-family: system-ui; text-align: center; padding: 100px;">
            <h1>🚀 Starting Flashcard Generator...</h1>
            <p>Please wait while the server initializes...</p>
            <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px auto; max-width: 400px;">
              <p>✅ Proxy server running on port 4000</p>
              <p>⏳ Next.js starting on port 9000</p>
              <p>🔄 Page will auto-refresh...</p>
            </div>
          </body>
          </html>
        `);
        return;
      }

      // Proxy to Next.js
      const options = {
        hostname: 'localhost',
        port: 9000,
        path: req.url,
        method: req.method,
        headers: req.headers
      };

      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error('Proxy error:', err);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
          <body style="font-family: system-ui; text-align: center; padding: 100px;">
            <h1>❌ Connection Error</h1>
            <p>Cannot connect to Next.js server</p>
            <button onclick="location.reload()">🔄 Retry</button>
          </body>
          </html>
        `);
      });

      req.pipe(proxyReq);
    });

    const PROXY_PORT = 4000;
    proxyServer.listen(PROXY_PORT, '0.0.0.0', () => {
      console.log(`🌐 Proxy server running on http://localhost:${PROXY_PORT}`);
      console.log(`🎯 Next.js will run on port 9000`);
      console.log(`📱 Access your app at: http://localhost:${PROXY_PORT}`);
    });

    proxyServer.on('error', (err) => {
      console.error('❌ Proxy server error:', err);
    });

    // Cleanup on exit
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      nextProcess.kill();
      proxyServer.close();
      process.exit(0);
    });

  }, 2000);
});