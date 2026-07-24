-- =============================================================================
-- PRE-DEPLOY VERIFY — SmartERP_TESTING (run BEFORE attendance deploy)
-- Safe: read-only checks only. No DROP / TRUNCATE / data changes.
-- =============================================================================
SET NOCOUNT ON;

PRINT '=== Database ===';
SELECT DB_NAME() AS CurrentDatabase;

IF DB_NAME() <> N'SmartERP_TESTING'
BEGIN
    PRINT 'WARNING: Expected database SmartERP_TESTING. Change connection if this is intentional.';
END

PRINT '=== Production tables row counts (must stay unchanged after deploy) ===';
SELECT N'UserMaster' AS TableName, COUNT(*) AS [RowCount] FROM dbo.UserMaster
UNION ALL SELECT N'OrgMaster', COUNT(*) FROM dbo.OrgMaster
UNION ALL SELECT N'LeaveTypeMaster', COUNT(*) FROM dbo.LeaveTypeMaster
UNION ALL SELECT N'UserLeaveApply', COUNT(*) FROM dbo.UserLeaveApply
UNION ALL SELECT N'Attendance (legacy - DO NOT TOUCH)', COUNT(*) FROM dbo.Attendance
UNION ALL SELECT N'DREntry', COUNT(*) FROM dbo.DREntry
UNION ALL SELECT N'InwardRegister', COUNT(*) FROM dbo.InwardRegister
UNION ALL SELECT N'OutwardRegister', COUNT(*) FROM dbo.OutwardRegister;

PRINT '=== Attendance module objects (before deploy) ===';
SELECT t.name AS AttendanceTable, p.rows AS ApproxRowCount
FROM sys.tables t
LEFT JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
WHERE t.name LIKE N'Attendance%'
ORDER BY t.name;

SELECT p.name AS AttendanceProcedure
FROM sys.procedures p
WHERE p.name LIKE N'sp_Attendance%'
ORDER BY p.name;

PRINT '=== Expected NEW attendance tables (created only if missing) ===';
SELECT ExpectedTable, CASE WHEN OBJECT_ID(N'dbo.' + ExpectedTable, N'U') IS NOT NULL THEN N'EXISTS' ELSE N'MISSING' END AS Status
FROM (VALUES
    (N'AttendanceShift'),
    (N'AttendanceEmployeeProfile'),
    (N'AttendanceEmployeeMonthlyOff'),
    (N'AttendanceLeaveRequest'),
    (N'AttendanceRecord'),
    (N'AttendanceAdminAction')
) AS x(ExpectedTable);

PRINT 'Pre-deploy verify complete.';
GO
