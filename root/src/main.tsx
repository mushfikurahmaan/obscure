import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './lib/theme'

// Ctrl+K global search shortcut
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    window.dispatchEvent(new Event('trigger-app-search'));
    return false;
  }
});

// Block DevTools shortcuts
window.addEventListener('keydown', (e) => {
  // Block Ctrl+Shift+I, Ctrl+Shift+C, and F12
  if (
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c')) ||
    e.key === 'F12'
  ) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});

// Block default browser context menu except on custom context menu elements
window.addEventListener('contextmenu', (e) => {
  // List of selectors for custom context menu triggers/content
  const allowedSelectors = [
    '.context-menu',
    '.dropdown-menu',
    '.radix-context-menu',
    '.radix-dropdown-menu',
    '[data-allow-context]'
  ];
  let el = e.target as Element | null;
  while (el && el instanceof Element) {
    if (allowedSelectors.some(sel => el!.matches(sel))) {
      return; // Allow context menu
    }
    el = el.parentElement;
  }
  e.preventDefault();
  e.stopPropagation();
  return false;
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
