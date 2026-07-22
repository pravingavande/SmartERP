const RELOAD_SESSION_PREFIX = 'smartepr_chunk_reload:';

/** True when the browser is trying to load a JS chunk that no longer exists (post-deploy cache mismatch). */
export function isChunkLoadFailure(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '');

  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('loading chunk') ||
    normalized.includes('chunkloaderror') ||
    normalized.includes('importing a module script failed')
  );
}

/** Reload once per route so a stale bundle can pick up the latest index.html + chunks. */
export function reloadOnceForStaleChunks(): void {
  const key = `${RELOAD_SESSION_PREFIX}${window.location.pathname}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  window.location.reload();
}

export function registerChunkLoadRecovery(): void {
  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadFailure(event.reason)) return;
    event.preventDefault();
    reloadOnceForStaleChunks();
  });
}
