const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the dist/frontend directory
app.use(express.static(path.join(__dirname, '../../dist/frontend')));

// Serve the main HTML file for all routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/frontend/index.html'));
});

app.listen(port, () => {
  console.log(`🌱 Rutty frontend server running on port ${port}`);
  console.log(`📱 Open http://localhost:${port} to view the application`);
});