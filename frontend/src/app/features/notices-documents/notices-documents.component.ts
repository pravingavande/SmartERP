import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { DocumentUploadService } from '../../core/services/document-upload.service';
import { EventCalendarService } from '../../core/services/event-calendar.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardDocumentItem, NoticeItem } from '../../core/models/dashboard.model';
import { CalendarEvent } from '../../core/models/calendar.model';
import { compareCreatedDateDesc } from '../../core/utils/document-sort.util';
import { EventViewModalComponent } from '../../shared/components/event-view-modal/event-view-modal.component';

type PanelTab = 'notices' | 'documents';

@Component({
  selector: 'app-notices-documents',
  imports: [FormsModule, RouterLink, EventViewModalComponent],
  templateUrl: './notices-documents.component.html',
  styleUrl: './notices-documents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoticesDocumentsComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly documentUploadService = inject(DocumentUploadService);
  private readonly eventCalendarService = inject(EventCalendarService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  private readonly pageData = toSignal(
    forkJoin({
      notices: this.dashboardService.getNotices(500, false),
      documents: this.dashboardService.getDocuments(500)
    }),
    { initialValue: { notices: [] as NoticeItem[], documents: [] as DashboardDocumentItem[] } }
  );

  readonly searchText = signal('');

  readonly notices = computed(() =>
    [...this.pageData().notices].sort(
      (a, b) => new Date(a.noticeDate).getTime() - new Date(b.noticeDate).getTime()
    )
  );

  readonly documents = computed(() =>
    [...this.pageData().documents].sort(compareCreatedDateDesc)
  );

  readonly filteredNotices = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    if (!q) return this.notices();
    return this.notices().filter(
      (n) => n.title.toLowerCase().includes(q) || this.formatDate(n.noticeDate).toLowerCase().includes(q)
    );
  });

  readonly filteredDocuments = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    if (!q) return this.documents();
    return this.documents().filter(
      (d) =>
        d.documentTitle.toLowerCase().includes(q) ||
        (d.organizationName?.toLowerCase().includes(q) ?? false) ||
        this.formatDate(d.createdDate).toLowerCase().includes(q)
    );
  });

  readonly panelTab = signal<PanelTab>(
    this.route.snapshot.queryParamMap.get('tab') === 'documents' ? 'documents' : 'notices'
  );

  readonly showEventModal = signal(false);
  readonly eventModalLoading = signal(false);
  readonly selectedEvent = signal<CalendarEvent | null>(null);
  private noticeEventRequestId = 0;

  setPanelTab(tab: PanelTab): void {
    this.panelTab.set(tab);
    this.searchText.set('');
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
  }

  formatDate(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  openDocument(doc: DashboardDocumentItem): void {
    if (!doc.documentPath?.trim()) return;
    const url = this.documentUploadService.fileUrl(doc.documentPath);
    this.documentUploadService.downloadFile(url).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => this.toast.showError('Unable to open document.', 'View failed')
    });
  }

  openNoticeEvent(eventId: number): void {
    if (!eventId) return;

    const requestId = ++this.noticeEventRequestId;
    this.showEventModal.set(false);
    this.selectedEvent.set(null);
    this.eventModalLoading.set(true);

    queueMicrotask(() => {
      if (requestId !== this.noticeEventRequestId) return;
      this.showEventModal.set(true);

      this.eventCalendarService.getEvent(eventId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (ev) => {
          if (requestId !== this.noticeEventRequestId) return;
          this.eventModalLoading.set(false);
          if (!ev) {
            this.toast.showError('Unable to load event details.');
            this.showEventModal.set(false);
            return;
          }
          this.selectedEvent.set(ev);
        },
        error: () => {
          if (requestId !== this.noticeEventRequestId) return;
          this.eventModalLoading.set(false);
          this.toast.showError('Unable to load event details.');
          this.showEventModal.set(false);
        }
      });
    });
  }

  closeEventModal(): void {
    this.noticeEventRequestId++;
    this.showEventModal.set(false);
    this.selectedEvent.set(null);
    this.eventModalLoading.set(false);
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

  attachmentLabel(path?: string | null): string {
    if (!path?.trim()) return 'Attachment';
    const name = path.split(/[/\\]/).pop() ?? path;
    return name.length > 40 ? `${name.slice(0, 37)}...` : name;
  }
}
