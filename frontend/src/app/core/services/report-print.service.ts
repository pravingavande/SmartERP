import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReportPrintService {
  /** Open PDF in a new tab for viewing — user prints manually when ready. */
  openPdf(blob: Blob, _title: string): void {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      URL.revokeObjectURL(url);
      return;
    }

    win.addEventListener(
      'beforeunload',
      () => URL.revokeObjectURL(url),
      { once: true }
    );

    // Fallback revoke if tab stays open a long time
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  }
}
