import { Injectable, inject, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TicketNotificationPayload, TicketPendingNotification } from '../models/ticket.model';
import { AuthService } from './auth.service';
import { TicketService } from './ticket.service';

@Injectable({ providedIn: 'root' })
export class TicketNotificationService {
  private readonly auth = inject(AuthService);
  private readonly ticketService = inject(TicketService);

  private connection: HubConnection | null = null;
  private readonly ticketCreatedSubject = new Subject<TicketNotificationPayload>();
  readonly ticketCreated$ = this.ticketCreatedSubject.asObservable();

  readonly pendingPopup = signal<TicketPendingNotification | null>(null);

  async start(orgIds: number[]): Promise<void> {
    await this.stop();
    const token = this.auth.getToken();
    if (!token || orgIds.length === 0) return;

    const hubUrl = `${environment.apiBaseUrl}/hubs/ticket`;
    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx) =>
          ctx.previousRetryCount >= 3 ? null : [0, 2000, 10000][ctx.previousRetryCount] ?? 10000
      })
      .configureLogging(LogLevel.None)
      .build();

    this.connection.on('TicketCreated', (payload: TicketNotificationPayload) => {
      this.ticketCreatedSubject.next(payload);
      this.loadLoginReminders();
    });

    try {
      await this.connection.start();
      await this.connection.invoke('JoinSchoolGroups', orgIds);
    } catch {
      // Hub may be unavailable before API deploy; login reminders still work.
    }
  }

  async stop(): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.stop();
    } catch {
      // ignore
    }
    this.connection = null;
  }

  loadLoginReminders(): void {
    this.ticketService.getPendingNotifications().subscribe((items) => {
      const next = items[0] ?? null;
      if (next) this.pendingPopup.set(next);
    });
  }

  clearPopup(): void {
    this.pendingPopup.set(null);
    this.loadLoginReminders();
  }
}
