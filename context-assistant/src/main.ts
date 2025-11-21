import './style.css';
import { App } from './App';
import { analytics } from './utils/analytics';

// Initialize Google Analytics
analytics.init('G-RZEQWBN30W');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});

