import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import { forkJoin } from 'rxjs';
import { AuthUser } from '../../../core/models/auth.model';
import { OrgOption } from '../../../core/models/audit.model';
import { AttendanceStats } from '../../../core/models/attendance.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IoRegisterService } from '../../../core/services/io-register.service';
import { todayIsoDate } from '../../../core/utils/date.util';
import { isAttendanceOnlyUser, resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';

Chart.register(...registerables);

@Component({
  selector: 'app-attendance-dashboard',
  imports: [RouterLink, RouterLinkActive, OrgSchoolSelectComponent],
  templateUrl: './attendance-dashboard.component.html',
  styleUrl: './attendance-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly attendance = inject(AttendanceService);
  private readonly io = inject(IoRegisterService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly navLinks = [
    { label: 'Dashboard', route: '/attendance/dashboard', exact: true },
    { label: 'Attendance Log', route: '/attendance/records', exact: false },
    { label: 'Work Shifts', route: '/attendance/shifts', exact: false },
    { label: 'Monthly Week Off', route: '/attendance/monthly-week-off', exact: false },
    { label: 'Leave Requests', route: '/attendance/leave-requests', exact: false },
    { label: 'Corrections', route: '/attendance/corrections', exact: false },
    { label: 'Team Payroll', route: '/attendance/payroll', exact: false }
  ];

  readonly user = signal<AuthUser | null>(this.auth.currentUser());
  readonly stats = signal<AttendanceStats | null>(null);
  readonly orgs = signal<OrgOption[]>([]);
  readonly orgId = signal<number | null>(null);

  readonly greeting = computed(() => {
    const u = this.user();
    if (!u) return 'Signed in';
    const role = (u.userRoleName ?? u.roleCode ?? '').replace(/_/g, ' ');
    return `${u.displayName} · ${role}`;
  });

  readonly organizationLabel = computed(() => {
    const u = this.user();
    return u?.schoolName ?? u?.sansthaName ?? '—';
  });

  readonly kpis = computed(() => {
    const s = this.stats();
    if (!s) {
      return [
        { label: 'Check-ins today', value: '—', sub: 'Loading', icon: 'checkins', tone: 'primary' },
        { label: 'On time', value: '—', sub: '', icon: 'ontime', tone: 'success' },
        { label: 'Late arrivals', value: '—', sub: 'Today', icon: 'late', tone: 'warning' },
        { label: 'Absent', value: '—', sub: 'Today', icon: 'absent', tone: 'info' }
      ];
    }

    const present = Number(s.todayAttendance ?? 0);
    const late = Number(s.lateCheckIns ?? 0);
    const absent = Number(s.absentEmployees ?? 0);
    const total = Number(s.totalEmployees ?? 0);
    const onTime = present > 0 ? Math.round(((present - late) / present) * 100) : 0;

    return [
      {
        label: 'Check-ins today',
        value: String(present),
        sub: `of ${total} employees`,
        icon: 'checkins',
        tone: 'primary'
      },
      { label: 'On time', value: `${onTime}%`, sub: 'Excluding late', icon: 'ontime', tone: 'success' },
      { label: 'Late arrivals', value: String(late), sub: 'Today', icon: 'late', tone: 'warning' },
      { label: 'Absent', value: String(absent), sub: 'Today', icon: 'absent', tone: 'info' }
    ];
  });

  private readonly barCanvas = viewChild<ElementRef<HTMLCanvasElement>>('barCanvas');
  private readonly lineCanvas = viewChild<ElementRef<HTMLCanvasElement>>('lineCanvas');
  private readonly doughnutCanvas = viewChild<ElementRef<HTMLCanvasElement>>('doughnutCanvas');

  private barChart: Chart | null = null;
  private lineChart: Chart | null = null;
  private doughnutChart: Chart | null = null;

  ngOnInit(): void {
    forkJoin({
      lookups: this.io.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups, profile }) => {
        const orgList = lookups.data?.orgs ?? [];
        this.orgs.set(orgList);
        const currentUser = this.auth.currentUser();
        const defaultOrg =
          isAttendanceOnlyUser(currentUser?.userRoleId) && currentUser?.schoolId
            ? currentUser.schoolId
            : resolveDefaultSchoolOrgId(orgList, profile as UserProfile);
        this.orgId.set(defaultOrg);
        if (defaultOrg) this.loadStats(defaultOrg);
      });
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.initCharts());
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  isAttendanceOnlyUser(): boolean {
    return isAttendanceOnlyUser(this.auth.currentUser()?.userRoleId);
  }

  onOrgChange(orgId: number | null): void {
    this.orgId.set(orgId);
    if (orgId) this.loadStats(orgId);
  }

  private loadStats(orgId: number): void {
    const today = todayIsoDate();
    this.attendance.getStats(orgId, today).subscribe((s) => {
      this.stats.set(s);
      this.destroyCharts();
      queueMicrotask(() => this.initCharts());
    });
  }

  private destroyCharts(): void {
    this.barChart?.destroy();
    this.lineChart?.destroy();
    this.doughnutChart?.destroy();
    this.barChart = this.lineChart = this.doughnutChart = null;
  }

  private initCharts(): void {
    const barEl = this.barCanvas()?.nativeElement;
    const lineEl = this.lineCanvas()?.nativeElement;
    const doughEl = this.doughnutCanvas()?.nativeElement;
    if (!barEl || !lineEl || !doughEl) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const s = this.stats();
    const present = Number(s?.todayAttendance ?? 40);
    const late = Number(s?.lateCheckIns ?? 5);
    const absent = Number(s?.absentEmployees ?? 8);
    const checkIns = [
      present,
      present + 2,
      present - 3,
      present + 1,
      present,
      Math.max(0, present - 20),
      Math.max(0, present - 30)
    ];
    const onTimePct = checkIns.map((c) => (c > 0 ? Math.min(100, Math.round(((c - late) / c) * 100)) : 0));

    const barConfig: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Check-ins',
            data: checkIns,
            backgroundColor: 'rgba(0, 123, 255, 0.75)',
            borderColor: 'rgb(0, 123, 255)',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 48
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Weekly check-ins',
            color: '#495057',
            font: { size: 14, weight: 600 }
          },
          tooltip: {
            backgroundColor: 'rgba(52, 58, 64, 0.95)',
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#6c757d' }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#6c757d' },
            grid: { color: 'rgba(0,0,0,0.06)' }
          }
        }
      }
    };

    const lineConfig: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'On-time %',
            data: onTimePct,
            borderColor: 'rgb(40, 167, 69)',
            backgroundColor: 'rgba(40, 167, 69, 0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: 'rgb(40, 167, 69)',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#495057', usePointStyle: true }
          },
          title: {
            display: true,
            text: 'On-time attendance rate',
            color: '#495057',
            font: { size: 14, weight: 600 }
          },
          tooltip: {
            backgroundColor: 'rgba(52, 58, 64, 0.95)',
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#6c757d' }
          },
          y: {
            min: 75,
            max: 100,
            ticks: {
              color: '#6c757d',
              callback: (v) => `${v}%`
            },
            grid: { color: 'rgba(0,0,0,0.06)' }
          }
        }
      }
    };

    const doughnutConfig: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Present', 'Late', 'Absent', 'Leave'],
        datasets: [
          {
            data: [Math.max(0, present - late), late, absent, Number(s?.leaveCount ?? 0)],
            backgroundColor: [
              'rgba(40, 167, 69, 0.85)',
              'rgba(255, 193, 7, 0.9)',
              'rgba(220, 53, 69, 0.85)',
              'rgba(23, 162, 184, 0.85)'
            ],
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#495057',
              padding: 14,
              usePointStyle: true
            }
          },
          title: {
            display: true,
            text: "Today's status mix",
            color: '#495057',
            font: { size: 14, weight: 600 }
          },
          tooltip: {
            backgroundColor: 'rgba(52, 58, 64, 0.95)',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw}`
            }
          }
        }
      }
    };

    this.barChart = new Chart(barEl, barConfig);
    this.lineChart = new Chart(lineEl, lineConfig);
    this.doughnutChart = new Chart(doughEl, doughnutConfig);
  }
}
