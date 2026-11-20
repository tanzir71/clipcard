import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.tsx';
import './app.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
  registerSW({ immediate: true });
}
