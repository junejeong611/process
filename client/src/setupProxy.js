const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://server:5001',
      changeOrigin: true,
      onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.writeHead(502, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          error: true,
          message: 'Proxy error: Unable to connect to backend server. Please try again later.'
        }));
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request:', req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        // Optionally log or modify proxy responses here
      },
      logLevel: 'debug',
    })
  );
}; 