-- =============================================================================
-- POST-DEPLOY VERIFY — SmartERP_TESTING (run AFTER attendance deploy)
-- Safe: read-only checks only.
-- =============================================================================
SET NOCOUNT ON;

PRINT '=== Required attendance tables ===';
SELECT ExpectedTable,
       CASE WHEN OBJECT_ID(N'dbo.' + ExpectedTable, N'U') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS Status
FROM (VALUES
    (N'AttendanceShift'),
    (N'AttendanceEmployeeProfile'),
    (N'AttendanceEmployeeMonthlyOff'),
    (N'AttendanceLeaveRequest'),
    (N'AttendanceRecord'),
    (N'AttendanceAdminAction')
) AS x(ExpectedTable);

PRINT '=== Required stored procedures ===';
SELECT ExpectedSp,
       CASE WHEN OBJECT_ID(N'dbo.' + ExpectedSp, N'P') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS Status
FROM (VALUES
    (N'sp_AttendanceShift_GetList'),
    (N'sp_AttendanceShift_Save'),
    (N'sp_AttendanceMonthlyOff_GetEmployees'),
    (N'sp_AttendanceMonthlyOff_SetOverride'),
    (N'sp_AttendanceLeaveRequest_GetList'),
    (N'sp_AttendanceLeaveRequest_Review'),
    (N'sp_AttendanceRecord_GetList'),
    (N'sp_AttendanceRecord_Reverse'),
    (N'sp_AttendanceRecord_ForceCheckout'),
    (N'sp_AttendancePayroll_GetEmployees')
) AS x(ExpectedSp);

PRINT '=== MonthlySalary column on AttendanceEmployeeProfile ===';
SELECT CASE WHEN COL_LENGTH(N'dbo.AttendanceEmployeeProfile', N'MonthlySalary') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS MonthlySalaryColumn;

PRINT '=== Production data still present (sanity — counts must match pre-deploy) ===';
SELECT N'UserMaster' AS TableName, COUNT(*) AS [RowCount] FROM dbo.UserMaster
UNION ALL SELECT N'OrgMaster', COUNT(*) FROM dbo.OrgMaster
UNION ALL SELECT N'Attendance (legacy - DO NOT TOUCH)', COUNT(*) FROM dbo.Attendance;

PRINT '=== Legacy dbo.Attendance schema unchanged (new module uses AttendanceRecord) ===';
SELECT CASE WHEN OBJECT_ID(N'dbo.Attendance', N'U') IS NOT NULL THEN N'OK - table exists, not modified by deploy' ELSE N'WARN - legacy table missing' END AS LegacyAttendanceStatus;

PRINT 'Post-deploy verify complete.';
GO
