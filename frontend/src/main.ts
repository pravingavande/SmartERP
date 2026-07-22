import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { registerChunkLoadRecovery } from './app/core/utils/chunk-reload.util';

registerChunkLoadRecovery();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
