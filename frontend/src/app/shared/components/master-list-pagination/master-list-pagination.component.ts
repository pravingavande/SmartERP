import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { pageCount, pageRange } from '../../../core/utils/master-list.util';

@Component({
  selector: 'app-master-list-pagination',
  imports: [FormsModule],
  templateUrl: './master-list-pagination.component.html',
  styleUrl: './master-list-pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterListPaginationComponent {
  readonly total = input.required<number>();
  readonly pageIndex = input.required<number>();
  readonly pageSize = input.required<number>();

  readonly pageCount = computed(() => pageCount(this.total(), this.pageSize()));
  readonly pageStart = computed(() => pageRange(this.total(), this.pageIndex(), this.pageSize()).start);
  readonly pageEnd = computed(() => pageRange(this.total(), this.pageIndex(), this.pageSize()).end);

  readonly pageIndexChange = output<number>();
  readonly pageSizeChange = output<number>();

  prev(): void {
    this.pageIndexChange.emit(Math.max(0, this.pageIndex() - 1));
  }

  next(): void {
    this.pageIndexChange.emit(Math.min(this.pageCount() - 1, this.pageIndex() + 1));
  }

  onPageSizeChange(size: number): void {
    this.pageSizeChange.emit(size);
  }
}
