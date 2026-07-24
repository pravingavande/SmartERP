import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface SchoolDashTile {
  label: string;
  description: string;
  icon: string;
  route: string;
  tone: string;
  adminOnly?: boolean;
}

interface SchoolDashSection {
  id: string;
  title: string;
  subtitle: string;
  tiles: SchoolDashTile[];
}

@Component({
  selector: 'app-school-dashboard',
  imports: [RouterLink],
  templateUrl: './school-dashboard.component.html',
  styleUrl: './school-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchoolDashboardComponent {
  private readonly auth = inject(AuthService);

  private readonly sections: SchoolDashSection[] = [
    {
      id: 'school',
      title: 'School',
      subtitle: 'School records, events, academics and support',
      tiles: [
        {
          label: 'School',
          description: 'Manage sanstha and school organization details',
          icon: 'school',
          route: '/schools',
          tone: 'school'
        },
        {
          label: 'Event',
          description: 'School event calendar and schedules',
          icon: 'event-calendar',
          route: '/event-calendar',
          tone: 'event'
        },
        {
          label: 'Academic Scheduler',
          description: 'Plan classes, subjects and academic timetable',
          icon: 'academic-calendar',
          route: '/academic-calendar',
          tone: 'academic'
        },
        {
          label: 'Ticket Raise',
          description: 'Raise and track school support tickets',
          icon: 'ticket',
          route: '/tickets',
          tone: 'ticket'
        },
        {
          label: 'Document Upload Master',
          description: 'Upload and manage school documents',
          icon: 'document-upload',
          route: '/document-upload-master',
          tone: 'document-upload',
          adminOnly: true
        },
        {
          label: 'Inward Register',
          description: 'Record incoming letters and official correspondence',
          icon: 'inward-register',
          route: '/io/inward',
          tone: 'inward'
        },
        {
          label: 'Outward Register',
          description: 'Record outgoing letters and dispatch details',
          icon: 'outward-register',
          route: '/io/outward',
          tone: 'outward'
        }
      ]
    },
    {
      id: 'teacher',
      title: 'Teacher',
      subtitle: 'Teacher master data and leave applications',
      tiles: [
        {
          label: 'Teacher Master',
          description: 'Add and maintain teacher profiles',
          icon: 'staff',
          route: '/teacher-master',
          tone: 'teacher'
        },
        {
          label: 'Teacher Leave Apply',
          description: 'Apply and manage teacher leave requests',
          icon: 'attendance',
          route: '/staff/leave-apply',
          tone: 'leave'
        },
        {
          label: 'Attendance',
          description: 'Shifts, records, leave requests, corrections and payroll',
          icon: 'attendance',
          route: '/attendance/dashboard',
          tone: 'attendance'
        }
      ]
    }
  ];

  readonly visibleSections = computed(() => {
    const canAccessAdminMasters = this.auth.isSansthaAdmin();
    return this.sections
      .map((section) => ({
        ...section,
        tiles: section.tiles.filter((tile) => !tile.adminOnly || canAccessAdminMasters)
      }))
      .filter((section) => section.tiles.length > 0);
  });
}
