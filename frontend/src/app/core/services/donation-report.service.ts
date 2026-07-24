import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DonationReportFilter } from '../models/donation-report.model';
import { HubReportFilter } from '../models/hub-report-filter.model';
import { HubReportDefinition } from '../models/hub-report.model';

@Injectable({ providedIn: 'root' })
export class DonationReportService {
  constructor(private readonly http: HttpClient) {}

  downloadPdf(endpoint: string, filter: DonationReportFilter): Observable<Blob | null> {
    return this.downloadHubPdf(endpoint, {
      orgId: filter.orgId,
      sansthaId: null,
      drHeadId: filter.drHeadId,
      paymentTypeId: filter.paymentTypeId,
      minAmount: filter.minAmount,
      ledgerHeadId: null,
      allLedgerHeads: false,
      itemGroupId: null,
      fromDate: filter.fromDate,
      toDate: filter.toDate
    });
  }

  downloadHubPdf(endpoint: string, filter: HubReportFilter, report?: HubReportDefinition): Observable<Blob | null> {
    let params = new HttpParams();
    if (filter.orgId) params = params.set('orgId', filter.orgId.toString());
    if (filter.sansthaId) params = params.set('sansthaId', filter.sansthaId.toString());
    if (filter.drHeadId) params = params.set('drHeadId', filter.drHeadId.toString());
    if (filter.paymentTypeId) params = params.set('paymentTypeId', filter.paymentTypeId.toString());
    if (filter.minAmount != null && filter.minAmount > 0) params = params.set('minAmount', filter.minAmount.toString());
    if (filter.ledgerHeadId) params = params.set('ledgerHeadId', filter.ledgerHeadId.toString());
    if (filter.allLedgerHeads) params = params.set('allLedgerHeads', 'true');
    if (filter.itemGroupId) params = params.set('itemGroupId', filter.itemGroupId.toString());

    const includeDates = !report
      || report.filterMode === 'date-range'
      || report.filterMode === 'ledger-head-date-range';
    if (includeDates && filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (includeDates && filter.toDate) params = params.set('toDate', filter.toDate);

    return this.http.get(`${environment.apiBaseUrl}${endpoint}`, { params, responseType: 'blob' }).pipe(
      catchError(() => of(null))
    );
  }
}
