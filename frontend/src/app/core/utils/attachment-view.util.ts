import { Observable } from 'rxjs';

/** Open a downloaded file blob in a new browser tab (images, PDFs, etc.). */
export function openBlobInNewTab(blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export function viewAttachmentFile(
  download$: Observable<Blob>,
  onError: (message: string) => void
): void {
  download$.subscribe({
    next: (blob) => openBlobInNewTab(blob),
    error: () => onError('Unable to open file.')
  });
}
