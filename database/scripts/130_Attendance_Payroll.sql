-- Attendance module: payroll support (salary on AttendanceEmployeeProfile, not UserMaster)
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.AttendanceEmployeeProfile', N'MonthlySalary') IS NULL
    ALTER TABLE dbo.AttendanceEmployeeProfile ADD MonthlySalary DECIMAL(12, 2) NULL;
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendancePayroll_GetEmployees
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        um.UserID,
        COALESCE(
            NULLIF(LTRIM(RTRIM(um.EmployeeName)), N''),
            NULLIF(LTRIM(RTRIM(CONCAT(um.Firstname, N' ', um.LastName))), N''),
            um.AppUserName,
            CAST(um.UserID AS NVARCHAR(20))
        ) AS EmployeeName,
        COALESCE(
            NULLIF(LTRIM(RTRIM(um.EmployeeShortName)), N''),
            um.AppUserName,
            CAST(um.UserID AS NVARCHAR(20))
        ) AS EmployeeCode,
        p.MonthlySalary,
        p.AttendanceShiftID,
        p.WeeklyOffDays,
        p.SaturdayOffPattern
    FROM dbo.UserMaster um
    LEFT JOIN dbo.AttendanceEmployeeProfile p
        ON p.UserID = um.UserID
       AND p.OrgID = @OrgID
    WHERE um.OrgID = @OrgID
      AND ISNULL(um.IsActive, 1) = 1
    ORDER BY EmployeeName, um.UserID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendancePayroll_GetPresentDates
    @OrgID BIGINT,
    @FromDate DATE,
    @ToDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ar.UserID,
        ar.AttendanceDate
    FROM dbo.AttendanceRecord ar
    WHERE ar.OrgID = @OrgID
      AND ar.AttendanceDate >= @FromDate
      AND ar.AttendanceDate <= @ToDate
      AND ar.CheckInTime IS NOT NULL
      AND ISNULL(ar.CheckInConfirmed, 1) = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendancePayroll_GetApprovedLeaves
    @OrgID BIGINT,
    @FromDate DATE,
    @ToDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lr.UserID,
        lr.StartDate,
        lr.EndDate
    FROM dbo.AttendanceLeaveRequest lr
    WHERE lr.OrgID = @OrgID
      AND lr.Status = N'approved'
      AND lr.EndDate >= @FromDate
      AND lr.StartDate <= @ToDate;
END
GO

PRINT '130_Attendance_Payroll applied.';
GO
