export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

/** Login school/sanstha row from vw_UserloginWithOrgIDAndORGGROUP */
export interface UserLoginSchoolContext {
  schoolId: number;
  sansthaId: number;
  appUserName: string;
  schoolName: string;
  sansthaName: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  userId: number;
  userName: string;
  displayName: string;
  roleCode: string;
  schoolId?: number;
  sansthaId?: number;
  schoolName?: string;
  sansthaName?: string;
  userRoleId?: number;
  userRoleName?: string;
  schoolContexts?: UserLoginSchoolContext[];
}

export interface AuthUser {
  userId: number;
  userName: string;
  displayName: string;
  roleCode: string;
  token: string;
  expiresAt: string;
  schoolId?: number;
  sansthaId?: number;
  schoolName?: string;
  sansthaName?: string;
  userRoleId?: number;
  userRoleName?: string;
  schoolContexts?: UserLoginSchoolContext[];
}
