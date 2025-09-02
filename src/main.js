// Simple initialization for ThreeGamificationUI
import './app/angular-bootstrap.js';

// Remove loading spinner
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const loading = document.getElementById('loading');
    const app = document.getElementById('angular-app');
    if (loading) loading.style.display = 'none';
    if (app) app.style.display = 'flex';
  }, 1000);
});