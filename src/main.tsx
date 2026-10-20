import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { primeVoices } from './lib/speech.ts';
import './index.css';

primeVoices();

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
