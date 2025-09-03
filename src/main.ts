// Required by Angular runtime unless running in zoneless mode
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Bootstrap the Angular application
bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error('Error starting app:', err));
