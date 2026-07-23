import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CalendarEvent } from '../../../core/models/calendar.model';
import { EventCalendarService } from '../../../core/services/event-calendar.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-event-view-modal',
  imports: [],
  templateUrl: './event-view-modal.component.html',
  styleUrl: './event-view-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventViewModalComponent {
  private readonly eventCalendarService = inject(EventCalendarService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly event = input<CalendarEvent | null>(null);
  readonly loading = input(false);
  readonly closed = output<void>();

  close(): void {
    // Defer so overlay click does not fall through to items beneath the modal.
    setTimeout(() => this.closed.emit(), 0);
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  timeLabel(value?: string | null): string {
    if (!value?.trim()) return '—';
    return value.slice(0, 5);
  }

  attachmentLabel(path?: string | null): string {
    if (!path?.trim()) return 'Attachment';
    const name = path.split(/[/\\]/).pop() ?? path;
    return name.length > 36 ? `${name.slice(0, 33)}...` : name;
  }

  showReporting(event: CalendarEvent): boolean {
    return (
      event.status === 'पूर्ण झाले' ||
      !!event.eventReporting?.trim() ||
      !!event.eventPhotoAttachment?.trim() ||
      !!event.eventNewsAttachment?.trim()
    );
  }

  openAttachment(fileName?: string | null): void {
    if (!fileName?.trim()) return;
    const url = this.eventCalendarService.fileUrl(fileName);
    this.eventCalendarService.downloadFile(url).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => this.toast.showError('Unable to open file.')
    });
  }
}
