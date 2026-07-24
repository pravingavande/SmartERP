-- Attendance module: daily check-in / check-out records (attendance log)
-- Does NOT alter UserMaster / OrgMaster / leave master.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.AttendanceRecord', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceRecord (
        AttendanceID        BIGINT IDENTITY(1, 1) NOT NULL,
        OrgID               BIGINT         NOT NULL,
        UserID              BIGINT         NOT NULL,
        AttendanceDate      DATE           NOT NULL,
        CheckInTime         DATETIME2      NULL,
        CheckOutTime        DATETIME2      NULL,
        CheckInLatitude     FLOAT          NULL,
        CheckInLongitude    FLOAT          NULL,
        CheckOutLatitude    FLOAT          NULL,
        CheckOutLongitude   FLOAT          NULL,
        CheckInPhotoPath    NVARCHAR(500)  NULL,
        CheckOutPhotoPath   NVARCHAR(500)  NULL,
        CheckInMethod       NVARCHAR(20)   NULL,
        CheckOutMethod      NVARCHAR(20)   NULL,
        OfficeName          NVARCHAR(255)  NULL,
        CheckInConfirmed    BIT            NOT NULL CONSTRAINT DF_AttendanceRecord_CheckInConfirmed DEFAULT (1),
        CheckOutConfirmed   BIT            NOT NULL CONSTRAINT DF_AttendanceRecord_CheckOutConfirmed DEFAULT (1),
        CheckInDeviceID     NVARCHAR(200)  NULL,
        CheckOutDeviceID    NVARCHAR(200)  NULL,
        CreatedOn           DATETIME2      NOT NULL CONSTRAINT DF_AttendanceRecord_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedOn          DATETIME2      NULL,
        CONSTRAINT PK_AttendanceRecord PRIMARY KEY CLUSTERED (AttendanceID),
        CONSTRAINT UQ_AttendanceRecord_Org_User_Date UNIQUE (OrgID, UserID, AttendanceDate)
    );

    CREATE NONCLUSTERED INDEX IX_AttendanceRecord_Org_Date ON dbo.AttendanceRecord (OrgID, AttendanceDate);
    CREATE NONCLUSTERED INDEX IX_AttendanceRecord_User_Date ON dbo.AttendanceRecord (UserID, AttendanceDate);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceRecord_GetList
    @OrgID BIGINT,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @UserID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 200
        ar.AttendanceID,
        ar.OrgID,
        ar.UserID,
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
        ar.AttendanceDate,
        ar.CheckInTime,
        ar.CheckOutTime,
        ar.CheckInLatitude,
        ar.CheckInLongitude,
        ar.CheckOutLatitude,
        ar.CheckOutLongitude,
        ar.CheckInPhotoPath,
        ar.CheckOutPhotoPath,
        ar.CheckInMethod,
        ar.CheckOutMethod,
        ar.OfficeName,
        ar.CheckInConfirmed,
        ar.CheckOutConfirmed,
        ar.CheckInDeviceID,
        ar.CheckOutDeviceID,
        p.AttendanceShiftID,
        p.WeeklyOffDays,
        p.SaturdayOffPattern
    FROM dbo.AttendanceRecord ar
    LEFT JOIN dbo.UserMaster um ON um.UserID = ar.UserID
    LEFT JOIN dbo.AttendanceEmployeeProfile p
        ON p.UserID = ar.UserID
       AND p.OrgID = ar.OrgID
    WHERE ar.OrgID = @OrgID
      AND (@FromDate IS NULL OR ar.AttendanceDate >= @FromDate)
      AND (@ToDate IS NULL OR ar.AttendanceDate <= @ToDate)
      AND (@UserID IS NULL OR ar.UserID = @UserID)
    ORDER BY ar.AttendanceDate DESC, ar.CheckInTime DESC, ar.AttendanceID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceRecord_GetById
    @AttendanceID BIGINT,
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ar.AttendanceID,
        ar.OrgID,
        ar.UserID,
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
        ar.AttendanceDate,
        ar.CheckInTime,
        ar.CheckOutTime,
        ar.CheckInLatitude,
        ar.CheckInLongitude,
        ar.CheckOutLatitude,
        ar.CheckOutLongitude,
        ar.CheckInPhotoPath,
        ar.CheckOutPhotoPath,
        ar.CheckInMethod,
        ar.CheckOutMethod,
        ar.OfficeName,
        ar.CheckInConfirmed,
        ar.CheckOutConfirmed,
        ar.CheckInDeviceID,
        ar.CheckOutDeviceID,
        p.AttendanceShiftID,
        p.WeeklyOffDays,
        p.SaturdayOffPattern
    FROM dbo.AttendanceRecord ar
    LEFT JOIN dbo.UserMaster um ON um.UserID = ar.UserID
    LEFT JOIN dbo.AttendanceEmployeeProfile p
        ON p.UserID = ar.UserID
       AND p.OrgID = ar.OrgID
    WHERE ar.AttendanceID = @AttendanceID
      AND ar.OrgID = @OrgID;
END
GO

PRINT '128_Attendance_Records applied.';
GO
