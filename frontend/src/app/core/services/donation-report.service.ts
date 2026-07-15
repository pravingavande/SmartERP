import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DonationReportFilter } from '../models/donation-report.model';

@Injectable({ providedIn: 'root' })
export class DonationReportService {
  constructor(private readonly http: HttpClient) {}

  downloadPdf(endpoint: string, filter: DonationReportFilter): Observable<Blob | null> {
    let params = new HttpParams();
    if (filter.orgId) params = params.set('orgId', filter.orgId.toString());
    if (filter.drHeadId) params = params.set('drHeadId', filter.drHeadId.toString());
    if (filter.paymentTypeId) params = params.set('paymentTypeId', filter.paymentTypeId.toString());
    if (filter.minAmount != null && filter.minAmount > 0) params = params.set('minAmount', filter.minAmount.toString());
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);

    return this.http.get(`${environment.apiBaseUrl}${endpoint}`, { params, responseType: 'blob' }).pipe(
      catchError(() => of(null))
    );
  }
}
