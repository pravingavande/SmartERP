-- =============================================================================
-- 131_Attendance_Live_Safe_Deploy.sql
-- Target database: SmartERP_TESTING (live API connection string)
--
-- SAFETY GUARANTEE:
--   - Target: SmartERP_TESTING only (NOT attendance_saas or any other database)
--   - Does NOT DROP DATABASE
--   - Does NOT DROP any existing table
--   - Does NOT TRUNCATE any table
--   - Does NOT ALTER legacy dbo.Attendance (used by production Attendance app)
--   - Does NOT ALTER UserMaster, OrgMaster, LeaveTypeMaster, UserLeaveApply
--   - Only creates NEW Attendance* tables IF NOT EXISTS (AttendanceRecord, etc.)
--   - Only CREATE OR ALTER attendance stored procedures
--   - Only adds MonthlySalary column to AttendanceEmployeeProfile IF missing
--
-- HOW TO RUN (SSMS):
--   1. Connect to SmartERP_TESTING
--   2. Enable SQLCMD Mode: Query menu -> SQLCMD Mode
--   3. Open this file and Execute
--
-- HOW TO RUN (sqlcmd from repo database\scripts folder):
--   sqlcmd -S YOUR_SERVER -d SmartERP_TESTING -U USER -P PASS -C -b -i 131_Attendance_Live_Safe_Deploy.sql
--
-- RECOMMENDED ORDER:
--   1) 131_Attendance_Live_PreVerify.sql
--   2) 131_Attendance_Live_Safe_Deploy.sql  (this file)
--   3) 131_Attendance_Live_PostVerify.sql
-- =============================================================================
SET NOCOUNT ON;
GO

IF DB_NAME() <> N'SmartERP_TESTING'
BEGIN
    RAISERROR(N'Stop: connect to SmartERP_TESTING before running this script.', 16, 1);
    RETURN;
END
GO

PRINT '=== Attendance safe deploy started ===';
PRINT 'Time: ' + CONVERT(NVARCHAR(30), SYSUTCDATETIME(), 126);
GO

-- Step 1: Shifts
:r .\125_Attendance_Shifts.sql

-- Step 2: Monthly week-off
:r .\126_Attendance_MonthlyOff.sql

-- Step 3: Leave requests (separate from leave master)
:r .\127_Attendance_LeaveRequests.sql

-- Step 4: Attendance records / log
:r .\128_Attendance_Records.sql

-- Step 5: Corrections (reverse / force checkout)
:r .\129_Attendance_Corrections.sql

-- Step 6: Payroll
:r .\130_Attendance_Payroll.sql

PRINT '=== Attendance safe deploy finished successfully ===';
GO
