import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CaseInspector } from './dev/CaseInspector.tsx';
import { Casebook } from './game/Casebook.tsx';
import './styles.css';

// The dev case inspector lives at #dev; everything else is the game.
const isDev = window.location.hash === '#dev';
if (isDev) document.body.classList.add('dev');

createRoot(document.getElementById('root')!).render(<StrictMode>{isDev ? <CaseInspector /> : <Casebook />}</StrictMode>);

window.addEventListener('hashchange', () => window.location.reload());
