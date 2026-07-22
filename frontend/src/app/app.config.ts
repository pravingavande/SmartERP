import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { ChunkLoadErrorHandler } from './core/handlers/chunk-load-error.handler';
import { isChunkLoadFailure, reloadOnceForStaleChunks } from './core/utils/chunk-reload.util';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withNavigationErrorHandler((error) => {
        if (isChunkLoadFailure(error.error ?? error)) {
          reloadOnceForStaleChunks();
        }
      })
    ),
    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor])),
    { provide: ErrorHandler, useClass: ChunkLoadErrorHandler }
  ]
};
