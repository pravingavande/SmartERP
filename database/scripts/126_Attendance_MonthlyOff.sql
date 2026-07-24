-- Attendance module: monthly week-off planner (per-employee date overrides)
-- Does NOT alter UserMaster / OrgMaster / leave master.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.AttendanceEmployeeProfile', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceEmployeeProfile (
        ProfileID           BIGINT IDENTITY(1, 1) NOT NULL,
        OrgID               BIGINT         NOT NULL,
        UserID              BIGINT         NOT NULL,
        AttendanceShiftID   BIGINT         NULL,
        WeeklyOffDays       NVARCHAR(7)    NULL,
        SaturdayOffPattern  NVARCHAR(30)   NULL,
        CreatedOn           DATETIME2      NOT NULL CONSTRAINT DF_AttendanceEmployeeProfile_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedOn          DATETIME2      NULL,
        CONSTRAINT PK_AttendanceEmployeeProfile PRIMARY KEY CLUSTERED (ProfileID),
        CONSTRAINT UQ_AttendanceEmployeeProfile_Org_User UNIQUE (OrgID, UserID)
    );

    CREATE NONCLUSTERED INDEX IX_AttendanceEmployeeProfile_OrgID ON dbo.AttendanceEmployeeProfile (OrgID);
END
GO

IF OBJECT_ID(N'dbo.AttendanceEmployeeMonthlyOff', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceEmployeeMonthlyOff (
        MonthlyOffID BIGINT IDENTITY(1, 1) NOT NULL,
        OrgID        BIGINT NOT NULL,
        UserID       BIGINT NOT NULL,
        WorkDate     DATE   NOT NULL,
        IsOff        BIT    NOT NULL,
        CreatedOn    DATETIME2 NOT NULL CONSTRAINT DF_AttendanceEmployeeMonthlyOff_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedOn   DATETIME2 NULL,
        CONSTRAINT PK_AttendanceEmployeeMonthlyOff PRIMARY KEY CLUSTERED (MonthlyOffID),
        CONSTRAINT UQ_AttendanceEmployeeMonthlyOff_User_Date UNIQUE (UserID, WorkDate)
    );

    CREATE NONCLUSTERED INDEX IX_AttendanceEmployeeMonthlyOff_Org_Date ON dbo.AttendanceEmployeeMonthlyOff (OrgID, WorkDate);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceMonthlyOff_GetEmployees
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

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceMonthlyOff_GetOverrides
    @OrgID BIGINT,
    @FromDate DATE,
    @ToDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        m.UserID,
        m.WorkDate,
        m.IsOff
    FROM dbo.AttendanceEmployeeMonthlyOff m
    WHERE m.OrgID = @OrgID
      AND m.WorkDate >= @FromDate
      AND m.WorkDate <= @ToDate;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceMonthlyOff_SetOverride
    @OrgID BIGINT,
    @UserID BIGINT,
    @WorkDate DATE,
    @OverrideType NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF @OverrideType = N'default'
    BEGIN
        DELETE FROM dbo.AttendanceEmployeeMonthlyOff
        WHERE OrgID = @OrgID
          AND UserID = @UserID
          AND WorkDate = @WorkDate;
        RETURN;
    END

    DECLARE @IsOff BIT = CASE WHEN @OverrideType = N'off' THEN 1 ELSE 0 END;

    IF EXISTS (
        SELECT 1
        FROM dbo.AttendanceEmployeeMonthlyOff m
        WHERE m.UserID = @UserID
          AND m.WorkDate = @WorkDate
    )
    BEGIN
        UPDATE dbo.AttendanceEmployeeMonthlyOff
        SET IsOff = @IsOff,
            OrgID = @OrgID,
            ModifiedOn = SYSUTCDATETIME()
        WHERE UserID = @UserID
          AND WorkDate = @WorkDate;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.AttendanceEmployeeMonthlyOff (OrgID, UserID, WorkDate, IsOff)
        VALUES (@OrgID, @UserID, @WorkDate, @IsOff);
    END
END
GO

PRINT '126_Attendance_MonthlyOff applied.';
GO
