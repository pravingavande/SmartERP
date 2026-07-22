import { ErrorHandler, Injectable } from '@angular/core';
import { isChunkLoadFailure, reloadOnceForStaleChunks } from '../utils/chunk-reload.util';

@Injectable()
export class ChunkLoadErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (isChunkLoadFailure(error)) {
      reloadOnceForStaleChunks();
      return;
    }
    console.error(error);
  }
}
