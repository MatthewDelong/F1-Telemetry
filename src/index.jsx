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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Fade out and remove the splash screen once React starts rendering
const splash = document.getElementById('initial-splash');
if (splash) {
  // Use a small delay to ensure the browser has a chance to paint the first frame of the app
  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.remove();
    }, 600); // Match the 0.6s transition duration in index.html
  }, 500);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();

