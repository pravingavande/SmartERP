import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TicketPendingNotification, ReplyFormState } from '../../../core/models/ticket.model';
import { TicketNotificationService } from '../../../core/services/ticket-notification.service';
import { TicketService } from '../../../core/services/ticket.service';
import { ToastService } from '../../../core/services/toast.service';

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
  readonly replied = output<void>();

  readonly loading = signal(false);
  readonly replyError = signal<string | null>(null);
  readonly replyForm = signal<ReplyFormState>({ replyText: '', replyStatus: 'Acknowledged', attachment: '' });

  readonly isInstant = () => this.ticket().replyRequired === 'Instant';

  submitReply(): void {
    const text = this.replyForm().replyText.trim();
    if (!text) {
      this.replyError.set('Reply is required before continuing.');
      return;
    }

    this.loading.set(true);
    this.replyError.set(null);
    this.ticketService
      .addReply(this.ticket().ticketID, this.replyForm())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((detail) => {
        this.loading.set(false);
        if (!detail) {
          this.replyError.set('Unable to save reply.');
          return;
        }
        this.toast.showSuccess('Reply submitted.');
        this.notificationService.clearPopup();
        this.replied.emit();
      });
  }

  dismissLater(): void {
    if (this.isInstant()) return;
    this.notificationService.dismissLater(this.ticket().ticketID);
    this.replied.emit();
  }

  updateReplyText(value: string): void {
    this.replyError.set(null);
    this.replyForm.update((f) => ({ ...f, replyText: value }));
  }
}
