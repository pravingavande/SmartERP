import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { EventCalendarService } from '../../core/services/event-calendar.service';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { PendingEventReportingSummary } from '../../core/models/calendar.model';

interface StatTile {
  label: string;
  value: number;
  icon: string;
  tone: string;
  hint?: string;
  route?: string;
}

interface BreakdownCard {
  title: string;
  icon: string;
  tone: string;
  rows: { label: string; value: number }[];
  totalLabel: string;
  total: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, RouterLink, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly eventCalendarService = inject(EventCalendarService);

  private readonly noticeListRef = viewChild<ElementRef<HTMLElement>>('noticeList');

  readonly sessionUser = this.auth.currentUser;

  private readonly dashboardData = toSignal(
    forkJoin({
      profile: this.dashboardService.getProfile(),
      summary: this.dashboardService.getSummary(),
      notices: this.dashboardService.getNotices(10),
      pendingReporting: this.eventCalendarService.getPendingReporting()
    }).pipe(map((data) => data)),
    { initialValue: { profile: null, summary: null, notices: [], pendingReporting: { pendingCount: 0, items: [] } as PendingEventReportingSummary } }
  );

  readonly profile = () => this.dashboardData().profile;
  readonly summary = () => this.dashboardData().summary;
  readonly notices = () => this.dashboardData().notices;
  readonly pendingReporting = () => this.dashboardData().pendingReporting;

  statTiles(summary: DashboardSummary): StatTile[] {
    return [
      {
        label: 'Total Schools',
        value: summary.totalSchool,
        icon: 'school',
        tone: 'navy',
        hint: 'Sanstha network'
      },
      {
        label: 'Total Students',
        value: summary.totalStudent,
        icon: 'students',
        tone: 'blue',
        hint: `मुले ${summary.maleStudents} | मुली ${summary.femaleStudents}`
      },
      {
        label: 'Total Teachers',
        value: summary.totalTeacher,
        icon: 'staff',
        tone: 'orange',
        hint: `Male ${summary.maleTeachers} | Female ${summary.femaleTeachers}`,
        route: '/staff'
      },
      {
        label: 'Teaching Staff',
        value: summary.teachingStaff,
        icon: 'teaching',
        tone: 'green',
        hint: 'Classroom faculty'
      },
      {
        label: 'Non-Teaching',
        value: summary.nonTeachingStaff,
        icon: 'support',
        tone: 'purple',
        hint: 'Support staff'
      },
      {
        label: 'Permanent',
        value: summary.permanentStaff,
        icon: 'permanent',
        tone: 'teal',
        hint: 'Regular employees'
      },
      {
        label: 'Temporary',
        value: summary.temporaryStaff,
        icon: 'temporary',
        tone: 'amber',
        hint: 'Contract / temp'
      }
    ];
  }

  breakdownCards(summary: DashboardSummary): BreakdownCard[] {
    return [
      {
        title: 'Students',
        icon: 'students',
        tone: 'blue',
        rows: [
          { label: 'मुले (Boys)', value: summary.maleStudents },
          { label: 'मुली (Girls)', value: summary.femaleStudents }
        ],
        totalLabel: 'Total Students',
        total: summary.totalStudent
      },
      {
        title: 'Teachers',
        icon: 'staff',
        tone: 'orange',
        rows: [
          { label: 'Male', value: summary.maleTeachers },
          { label: 'Female', value: summary.femaleTeachers }
        ],
        totalLabel: 'Total Teachers',
        total: summary.totalTeacher
      },
      {
        title: 'Staff Type',
        icon: 'teaching',
        tone: 'green',
        rows: [
          { label: 'Teaching', value: summary.teachingStaff },
          { label: 'Non-Teaching', value: summary.nonTeachingStaff }
        ],
        totalLabel: 'Total Staff',
        total: summary.totalTeacher
      },
      {
        title: 'Employment',
        icon: 'permanent',
        tone: 'teal',
        rows: [
          { label: 'Permanent', value: summary.permanentStaff },
          { label: 'Temporary', value: summary.temporaryStaff }
        ],
        totalLabel: 'Total Employees',
        total: summary.totalTeacher
      }
    ];
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

  scrollNotices(): void {
    const el = this.noticeListRef()?.nativeElement;
    if (!el) return;
    el.scrollBy({ top: 120, behavior: 'smooth' });
  }
}
