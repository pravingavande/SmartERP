-- Half-day leave: store fractional NoOfDay (0.5) on UserLeaveApply.
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.UserLeaveApply', 'NoOfDay') IS NOT NULL
BEGIN
    DECLARE @NoOfDayType SYSNAME;
    SELECT @NoOfDayType = t.name
    FROM sys.columns c
    INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.UserLeaveApply')
      AND c.name = N'NoOfDay';

    IF @NoOfDayType IN (N'int', N'bigint', N'smallint', N'tinyint')
    BEGIN
        ALTER TABLE dbo.UserLeaveApply
        ALTER COLUMN NoOfDay DECIMAL(5, 2) NULL;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveApply_Save
    @UserLeaveApplyID BIGINT = NULL OUTPUT,
    @OrgID BIGINT = NULL,
    @RecordNo BIGINT = NULL,
    @TDate DATE = NULL,
    @UserID BIGINT = NULL,
    @LeaveTypeID BIGINT = NULL,
    @LeaveReason NVARCHAR(MAX) = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @NoOfDay DECIMAL(5, 2) = NULL,
    @AdminRemak NVARCHAR(MAX) = NULL,
    @LeavePermissionID BIGINT = NULL,
    @AyID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @NoOfDay IS NULL
       AND @FromDate IS NOT NULL
       AND @ToDate IS NOT NULL
       AND @ToDate >= @FromDate
    BEGIN
        SET @NoOfDay = CAST(DATEDIFF(DAY, @FromDate, @ToDate) + 1 AS DECIMAL(5, 2));
    END

    IF @UserLeaveApplyID IS NULL OR @UserLeaveApplyID = 0
    BEGIN
        IF @RecordNo IS NULL OR @RecordNo = 0
        BEGIN
            SELECT @RecordNo = ISNULL(MAX(ula.RecordNo), 0) + 1
            FROM dbo.UserLeaveApply ula
            WHERE ula.OrgID = @OrgID;
        END

        INSERT INTO dbo.UserLeaveApply (
            OrgID,
            RecordNo,
            TDate,
            UserID,
            LeaveTypeID,
            LeaveReason,
            FromDate,
            ToDate,
            NoOfDay,
            AdminRemak,
            LeavePermissionID,
            AyID
        )
        VALUES (
            @OrgID,
            @RecordNo,
            @TDate,
            @UserID,
            @LeaveTypeID,
            @LeaveReason,
            @FromDate,
            @ToDate,
            @NoOfDay,
            @AdminRemak,
            @LeavePermissionID,
            @AyID
        );

        SET @UserLeaveApplyID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.UserLeaveApply
        SET
            OrgID = @OrgID,
            RecordNo = @RecordNo,
            TDate = @TDate,
            UserID = @UserID,
            LeaveTypeID = @LeaveTypeID,
            LeaveReason = @LeaveReason,
            FromDate = @FromDate,
            ToDate = @ToDate,
            NoOfDay = @NoOfDay,
            AdminRemak = @AdminRemak,
            LeavePermissionID = @LeavePermissionID,
            AyID = @AyID
        WHERE UserLeaveApplyID = @UserLeaveApplyID;
    END
END
GO

PRINT '113_LeaveApply_HalfDay applied.';
GO
