import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CaseInspector } from './dev/CaseInspector.tsx';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CaseInspector />
  </StrictMode>,
);
