const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*'
  });
  
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Flashcard Generator - Test Server</title>
      <style>
        body { font-family: system-ui; padding: 40px; background: #f0f2f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status { background: #22c55e; color: white; padding: 12px 20px; border-radius: 6px; margin: 20px 0; }
        .info { background: #3b82f6; color: white; padding: 12px 20px; border-radius: 6px; margin: 20px 0; }
        .action { background: #8b5cf6; color: white; padding: 12px 20px; border-radius: 6px; margin: 20px 0; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎉 Flashcard Generator - Server Running!</h1>
        
        <div class="status">
          ✅ HTTP Server is working correctly
        </div>
        
        <div class="info">
          📍 Server: http://localhost:7777<br>
          🕒 Time: ${new Date().toLocaleString()}<br>
          📊 Status: All systems operational
        </div>
        
        <p>The basic HTTP server is working. This confirms that:</p>
        <ul>
          <li>✅ Node.js is functioning properly</li>
          <li>✅ Network connectivity is working</li>
          <li>✅ Port binding is successful</li>
          <li>✅ Browser can reach the server</li>
        </ul>
        
        <p><strong>Next Step:</strong> The issue is likely with Next.js configuration or dependencies.</p>
        
        <a href="#" class="action" onclick="location.reload()">🔄 Refresh Test</a>
      </div>
    </body>
    </html>
  `);
});

const PORT = 7777;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`🌐 Also available on http://127.0.0.1:${PORT}`);
  console.log(`📡 Network: http://0.0.0.0:${PORT}`);
  console.log('✅ Server started successfully!');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});