-- Attendance module: shift definitions (separate from dbo.ShiftMaster used by Teacher)
-- Maps Attendance app tenants -> OrgID. Does NOT alter UserMaster / OrgMaster.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.AttendanceShift', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceShift (
        ShiftID              BIGINT IDENTITY(1, 1) NOT NULL,
        OrgID                BIGINT         NOT NULL,
        ShiftName            NVARCHAR(100)  NOT NULL,
        ShiftCode            NVARCHAR(30)   NOT NULL,
        StartTime            NVARCHAR(5)    NOT NULL,
        EndTime              NVARCHAR(5)    NOT NULL,
        GraceMinutes         INT            NOT NULL CONSTRAINT DF_AttendanceShift_GraceMinutes DEFAULT (15),
        EarlyCheckinMinutes  INT            NOT NULL CONSTRAINT DF_AttendanceShift_EarlyCheckin DEFAULT (60),
        IsNightShift         BIT            NOT NULL CONSTRAINT DF_AttendanceShift_IsNightShift DEFAULT (0),
        WorkingDays          NVARCHAR(7)    NOT NULL CONSTRAINT DF_AttendanceShift_WorkingDays DEFAULT (N'1111100'),
        IsActive             BIT            NOT NULL CONSTRAINT DF_AttendanceShift_IsActive DEFAULT (1),
        TimingMode           NVARCHAR(20)   NOT NULL CONSTRAINT DF_AttendanceShift_TimingMode DEFAULT (N'fixed'),
        RequiredWorkMinutes  INT            NULL,
        LunchMinutes         INT            NOT NULL CONSTRAINT DF_AttendanceShift_LunchMinutes DEFAULT (60),
        FlexWindowStart      NVARCHAR(5)    NULL,
        FlexWindowEnd        NVARCHAR(5)    NULL,
        CreatedOn            DATETIME2      NOT NULL CONSTRAINT DF_AttendanceShift_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedOn           DATETIME2      NULL,
        CONSTRAINT PK_AttendanceShift PRIMARY KEY CLUSTERED (ShiftID),
        CONSTRAINT UQ_AttendanceShift_Org_Code UNIQUE (OrgID, ShiftCode)
    );

    CREATE NONCLUSTERED INDEX IX_AttendanceShift_OrgID ON dbo.AttendanceShift (OrgID);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceShift_GetList
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.ShiftID,
        s.OrgID,
        s.ShiftName,
        s.ShiftCode,
        s.StartTime,
        s.EndTime,
        s.GraceMinutes,
        s.EarlyCheckinMinutes,
        s.IsNightShift,
        s.WorkingDays,
        s.IsActive,
        s.TimingMode,
        s.RequiredWorkMinutes,
        s.LunchMinutes,
        s.FlexWindowStart,
        s.FlexWindowEnd
    FROM dbo.AttendanceShift s
    WHERE s.OrgID = @OrgID
    ORDER BY s.ShiftName, s.ShiftID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceShift_GetById
    @ShiftID BIGINT,
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.ShiftID,
        s.OrgID,
        s.ShiftName,
        s.ShiftCode,
        s.StartTime,
        s.EndTime,
        s.GraceMinutes,
        s.EarlyCheckinMinutes,
        s.IsNightShift,
        s.WorkingDays,
        s.IsActive,
        s.TimingMode,
        s.RequiredWorkMinutes,
        s.LunchMinutes,
        s.FlexWindowStart,
        s.FlexWindowEnd
    FROM dbo.AttendanceShift s
    WHERE s.ShiftID = @ShiftID
      AND s.OrgID = @OrgID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceShift_Save
    @ShiftID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @ShiftName NVARCHAR(100),
    @ShiftCode NVARCHAR(30),
    @StartTime NVARCHAR(5),
    @EndTime NVARCHAR(5),
    @GraceMinutes INT = 15,
    @EarlyCheckinMinutes INT = 60,
    @IsNightShift BIT = 0,
    @WorkingDays NVARCHAR(7) = N'1111100',
    @IsActive BIT = 1,
    @TimingMode NVARCHAR(20) = N'fixed',
    @RequiredWorkMinutes INT = NULL,
    @LunchMinutes INT = 60,
    @FlexWindowStart NVARCHAR(5) = NULL,
    @FlexWindowEnd NVARCHAR(5) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @ShiftName IS NULL OR LTRIM(RTRIM(@ShiftName)) = N''
    BEGIN
        RAISERROR('Shift name is required.', 16, 1);
        RETURN;
    END

    IF @ShiftCode IS NULL OR LTRIM(RTRIM(@ShiftCode)) = N''
    BEGIN
        RAISERROR('Shift code is required.', 16, 1);
        RETURN;
    END

    SET @ShiftCode = UPPER(LTRIM(RTRIM(@ShiftCode)));
    SET @ShiftName = LTRIM(RTRIM(@ShiftName));
    SET @TimingMode = CASE WHEN @TimingMode = N'flexible' THEN N'flexible' ELSE N'fixed' END;

    IF @ShiftID IS NULL OR @ShiftID = 0
    BEGIN
        IF (SELECT COUNT(1) FROM dbo.AttendanceShift s WHERE s.OrgID = @OrgID) >= 10
        BEGIN
            RAISERROR('Maximum 10 shifts per organization.', 16, 1);
            RETURN;
        END

        INSERT INTO dbo.AttendanceShift (
            OrgID, ShiftName, ShiftCode, StartTime, EndTime,
            GraceMinutes, EarlyCheckinMinutes, IsNightShift, WorkingDays, IsActive,
            TimingMode, RequiredWorkMinutes, LunchMinutes, FlexWindowStart, FlexWindowEnd
        )
        VALUES (
            @OrgID, @ShiftName, @ShiftCode, @StartTime, @EndTime,
            @GraceMinutes, @EarlyCheckinMinutes, @IsNightShift, @WorkingDays, @IsActive,
            @TimingMode, @RequiredWorkMinutes, @LunchMinutes, @FlexWindowStart, @FlexWindowEnd
        );

        SET @ShiftID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.AttendanceShift
        SET ShiftName = @ShiftName,
            ShiftCode = @ShiftCode,
            StartTime = @StartTime,
            EndTime = @EndTime,
            GraceMinutes = @GraceMinutes,
            EarlyCheckinMinutes = @EarlyCheckinMinutes,
            IsNightShift = @IsNightShift,
            WorkingDays = @WorkingDays,
            IsActive = @IsActive,
            TimingMode = @TimingMode,
            RequiredWorkMinutes = @RequiredWorkMinutes,
            LunchMinutes = @LunchMinutes,
            FlexWindowStart = @FlexWindowStart,
            FlexWindowEnd = @FlexWindowEnd,
            ModifiedOn = SYSUTCDATETIME()
        WHERE ShiftID = @ShiftID
          AND OrgID = @OrgID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceShift_Delete
    @ShiftID BIGINT,
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.AttendanceShift
    WHERE ShiftID = @ShiftID
      AND OrgID = @OrgID;
END
GO

PRINT '125_Attendance_Shifts applied.';
GO
