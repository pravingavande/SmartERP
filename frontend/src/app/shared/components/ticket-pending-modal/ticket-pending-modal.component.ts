import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TicketPendingNotification } from '../../../core/models/ticket.model';
import { TicketNotificationService } from '../../../core/services/ticket-notification.service';
import { TicketService } from '../../../core/services/ticket.service';
import { ToastService } from '../../../core/services/toast.service';
import { looksLikeMojibake } from '../../../core/utils/ticket-status.util';

@Component({
  selector: 'app-ticket-pending-modal',
  imports: [FormsModule, DatePipe],
  templateUrl: './ticket-pending-modal.component.html',
  styleUrl: './ticket-pending-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketPendingModalComponent {
  private readonly ticketService = inject(TicketService);
  private readonly notificationService = inject(TicketNotificationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ticket = input.required<TicketPendingNotification>();
  readonly acknowledged = output<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly agreed = signal(false);

  readonly looksLikeMojibake = looksLikeMojibake;

  acknowledge(): void {
    if (!this.agreed()) {
      this.error.set('कृपया खालील चेकबॉक्स निवडा.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.ticketService
      .acknowledge(this.ticket().ticketID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        this.loading.set(false);
        if (!ok) {
          this.error.set('माहिती नोंदवता आली नाही. पुन्हा प्रयत्न करा.');
          return;
        }
        this.toast.showSuccess('तिकीट माहिती वाचल्याची नोंद झाली.');
        this.notificationService.clearPopup();
        this.acknowledged.emit();
      });
  }

  onAgreedChange(checked: boolean): void {
    this.error.set(null);
    this.agreed.set(checked);
  }
}
