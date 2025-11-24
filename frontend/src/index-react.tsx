import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './auth-styles.css';

console.log('🚀 React entry point loaded');

const container = document.getElementById('root');
if (!container) {
  console.error('❌ Root element not found!');
  throw new Error('Root element not found');
}

console.log('✅ Root element found:', container);

try {
  const root = createRoot(container);
  console.log('✅ React root created');
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ React render called');
} catch (error) {
  console.error('❌ Error during React initialization:', error);
  // Display error on page
  document.body.innerHTML = `
    <div style="padding: 20px; background: #fee; color: #c00; font-family: monospace;">
      <h1>React Failed to Initialize</h1>
      <pre>${error}</pre>
      <p>Check the browser console (F12) for more details.</p>
    </div>
  `;
}
