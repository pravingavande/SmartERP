import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReportPrintService {
  openPdf(blob: Blob, _title: string): void {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      URL.revokeObjectURL(url);
      return;
    }

    const timer = window.setTimeout(() => {
      if (!win.closed) {
        win.focus();
        win.print();
      }
    }, 600);

    win.addEventListener(
      'beforeunload',
      () => {
        window.clearTimeout(timer);
        URL.revokeObjectURL(url);
      },
      { once: true }
    );
  }
}
