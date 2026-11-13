import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import reportWebVitals from './reportWebVitals';
import './index.css';

// Global configuration for model-viewer decoders
if (typeof window !== 'undefined') {
  window.ModelViewerElement = window.ModelViewerElement || {};
  window.ModelViewerElement.dracoDecoderLocation = '/decoders/draco/';
  window.ModelViewerElement.meshoptDecoderLocation = '/decoders/meshopt/meshopt_decoder.js';
}

import { PreferencesProvider } from './contexts/PreferencesContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PreferencesProvider>
      <App />
    </PreferencesProvider>
  </React.StrictMode>
);

// Fade out and remove the splash screen as soon as React paints its first frame
const splash = document.getElementById('initial-splash');
if (splash) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.remove();
      }, 450); // Match the 0.45s transition duration in index.html
    });
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();

