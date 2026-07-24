-- Attendance module: employee leave requests (approval workflow)
-- Separate from dbo.UserLeaveApply / LeaveTypeMaster. Does NOT alter UserMaster / OrgMaster / leave master.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.AttendanceLeaveRequest', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceLeaveRequest (
        LeaveRequestID BIGINT IDENTITY(1, 1) NOT NULL,
        OrgID            BIGINT         NOT NULL,
        UserID           BIGINT         NOT NULL,
        LeaveType        NVARCHAR(30)   NOT NULL,
        StartDate        DATE           NOT NULL,
        EndDate          DATE           NOT NULL,
        Reason           NVARCHAR(2000) NULL,
        Status           NVARCHAR(20)   NOT NULL CONSTRAINT DF_AttendanceLeaveRequest_Status DEFAULT (N'pending'),
        ReviewedBy       BIGINT         NULL,
        ReviewedAt       DATETIME2      NULL,
        ReviewComment    NVARCHAR(2000) NULL,
        CreatedOn        DATETIME2      NOT NULL CONSTRAINT DF_AttendanceLeaveRequest_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedOn       DATETIME2      NULL,
        CONSTRAINT PK_AttendanceLeaveRequest PRIMARY KEY CLUSTERED (LeaveRequestID)
    );

    CREATE NONCLUSTERED INDEX IX_AttendanceLeaveRequest_Org_Status ON dbo.AttendanceLeaveRequest (OrgID, Status);
    CREATE NONCLUSTERED INDEX IX_AttendanceLeaveRequest_User_Dates ON dbo.AttendanceLeaveRequest (UserID, StartDate, EndDate);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceLeaveRequest_GetList
    @OrgID BIGINT,
    @Status NVARCHAR(20) = NULL,
    @UserID BIGINT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 200
        lr.LeaveRequestID,
        lr.OrgID,
        lr.UserID,
        COALESCE(
            NULLIF(LTRIM(RTRIM(um.EmployeeName)), N''),
            NULLIF(LTRIM(RTRIM(CONCAT(um.Firstname, N' ', um.LastName))), N''),
            um.AppUserName,
            CAST(um.UserID AS NVARCHAR(20))
        ) AS UserName,
        COALESCE(
            NULLIF(LTRIM(RTRIM(um.EmployeeShortName)), N''),
            um.AppUserName,
            CAST(um.UserID AS NVARCHAR(20))
        ) AS EmployeeCode,
        lr.LeaveType,
        lr.StartDate,
        lr.EndDate,
        lr.Reason,
        lr.Status,
        lr.ReviewedBy,
        lr.ReviewedAt,
        lr.ReviewComment,
        lr.CreatedOn
    FROM dbo.AttendanceLeaveRequest lr
    LEFT JOIN dbo.UserMaster um ON um.UserID = lr.UserID
    WHERE lr.OrgID = @OrgID
      AND (@Status IS NULL OR lr.Status = @Status)
      AND (@UserID IS NULL OR lr.UserID = @UserID)
      AND (@FromDate IS NULL OR lr.EndDate >= @FromDate)
      AND (@ToDate IS NULL OR lr.StartDate <= @ToDate)
    ORDER BY lr.CreatedOn DESC, lr.LeaveRequestID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceLeaveRequest_GetMy
    @UserID BIGINT,
    @OrgID BIGINT,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 100
        lr.LeaveRequestID,
        lr.OrgID,
        lr.UserID,
        lr.LeaveType,
        lr.StartDate,
        lr.EndDate,
        lr.Reason,
        lr.Status,
        lr.ReviewedAt,
        lr.ReviewComment,
        lr.CreatedOn
    FROM dbo.AttendanceLeaveRequest lr
    WHERE lr.UserID = @UserID
      AND lr.OrgID = @OrgID
      AND (@FromDate IS NULL OR lr.EndDate >= @FromDate)
      AND (@ToDate IS NULL OR lr.StartDate <= @ToDate)
    ORDER BY lr.StartDate DESC, lr.LeaveRequestID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceLeaveRequest_Apply
    @LeaveRequestID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @UserID BIGINT,
    @LeaveType NVARCHAR(30),
    @StartDate DATE,
    @EndDate DATE,
    @Reason NVARCHAR(2000) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.UserMaster um
        WHERE um.UserID = @UserID
          AND um.OrgID = @OrgID
          AND ISNULL(um.IsActive, 1) = 1
    )
    BEGIN
        RAISERROR('Invalid employee for this organization.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.AttendanceLeaveRequest (
        OrgID, UserID, LeaveType, StartDate, EndDate, Reason, Status
    )
    VALUES (
        @OrgID, @UserID, @LeaveType, @StartDate, @EndDate, @Reason, N'pending'
    );

    SET @LeaveRequestID = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceLeaveRequest_Review
    @LeaveRequestID BIGINT,
    @OrgID BIGINT,
    @ReviewedBy BIGINT,
    @Status NVARCHAR(20),
    @ReviewComment NVARCHAR(2000) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.AttendanceLeaveRequest lr
        WHERE lr.LeaveRequestID = @LeaveRequestID
          AND lr.OrgID = @OrgID
          AND lr.Status = N'pending'
    )
    BEGIN
        RAISERROR('Leave request not found or already reviewed.', 16, 1);
        RETURN;
    END

    UPDATE dbo.AttendanceLeaveRequest
    SET Status = @Status,
        ReviewedBy = @ReviewedBy,
        ReviewedAt = SYSUTCDATETIME(),
        ReviewComment = @ReviewComment,
        ModifiedOn = SYSUTCDATETIME()
    WHERE LeaveRequestID = @LeaveRequestID
      AND OrgID = @OrgID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceLeaveRequest_GetById
    @LeaveRequestID BIGINT,
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lr.LeaveRequestID,
        lr.OrgID,
        lr.UserID,
        COALESCE(
            NULLIF(LTRIM(RTRIM(um.EmployeeName)), N''),
            NULLIF(LTRIM(RTRIM(CONCAT(um.Firstname, N' ', um.LastName))), N''),
            um.AppUserName,
            CAST(um.UserID AS NVARCHAR(20))
        ) AS UserName,
        COALESCE(
            NULLIF(LTRIM(RTRIM(um.EmployeeShortName)), N''),
            um.AppUserName,
            CAST(um.UserID AS NVARCHAR(20))
        ) AS EmployeeCode,
        lr.LeaveType,
        lr.StartDate,
        lr.EndDate,
        lr.Reason,
        lr.Status,
        lr.ReviewedBy,
        lr.ReviewedAt,
        lr.ReviewComment,
        lr.CreatedOn
    FROM dbo.AttendanceLeaveRequest lr
    LEFT JOIN dbo.UserMaster um ON um.UserID = lr.UserID
    WHERE lr.LeaveRequestID = @LeaveRequestID
      AND lr.OrgID = @OrgID;
END
GO

PRINT '127_Attendance_LeaveRequests applied.';
GO
