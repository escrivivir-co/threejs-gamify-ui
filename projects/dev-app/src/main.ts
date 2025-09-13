import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Handle ResizeObserver loop errors (common with Three.js)
window.addEventListener('error', (event): boolean => {
  if (event.message && event.message.includes('ResizeObserver loop')) {
    event.preventDefault();
    console.debug('Suppressed ResizeObserver loop error (harmless)');
    return false;
  }
  return true;
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
