import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';
import { apiData, apiMessage, apiSuccess } from '../utils/api-response.util';

export interface SuperAdminBusinessCategory {
  businessCategoryID: number;
  businessCategoryName: string;
}

export interface CreateSansthaWithOwnerRequest {
  sansthaName: string;
  businessCategoryID: number | null;
  ownerFirstName: string;
  ownerMiddleName: string;
  ownerLastName: string;
  ownerMobile: string;
  ownerPassword: string;
}

export interface SansthaOwnerCreated {
  sansthaOrgID: number;
  sansthaName: string;
  ownerUserID: number;
  ownerUserName: string;
  ownerDisplayName: string;
  ownerUserRoleID: number;
}

export interface SansthaOwnerListItem {
  sansthaOrgID: number;
  sansthaName: string;
  srNo?: number | null;
  sansthaIsActive: boolean;
  ownerUserID: number;
  ownerFirstName: string;
  ownerMiddleName?: string | null;
  ownerLastName: string;
  ownerDisplayName: string;
  ownerUserName: string;
  ownerMobile?: string | null;
  ownerIsActive: boolean;
  ownerCreatedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/super-admin`;

  getBusinessCategories(): Observable<SuperAdminBusinessCategory[]> {
    return this.http.get<ApiResponse<SuperAdminBusinessCategory[]>>(`${this.base}/business-categories`).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? apiData(r)! : [])),
      catchError(() => of([]))
    );
  }

  getSansthaOwners(): Observable<SansthaOwnerListItem[]> {
    return this.http.get<ApiResponse<SansthaOwnerListItem[]>>(`${this.base}/sanstha-owners`).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? apiData(r)! : [])),
      catchError(() => of([]))
    );
  }

  createSansthaWithOwner(request: CreateSansthaWithOwnerRequest): Observable<{ data: SansthaOwnerCreated | null; message?: string }> {
    return this.http.post<ApiResponse<SansthaOwnerCreated>>(`${this.base}/sanstha-with-owner`, request).pipe(
      map((r) => ({
        data: apiSuccess(r) && apiData(r) ? apiData(r)! : null,
        message: apiMessage(r)
      })),
      catchError(() => of({ data: null, message: 'Unable to create Sanstha and Owner.' }))
    );
  }
}
