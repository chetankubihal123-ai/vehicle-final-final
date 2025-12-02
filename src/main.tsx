import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// SAFE SERVICE WORKER REGISTRATION (won’t crash app if unsupported)
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/service-worker.js")
            .then(() => console.log("[SW] registered"))
            .catch(err => console.warn("[SW] registration failed:", err));
    });
}
