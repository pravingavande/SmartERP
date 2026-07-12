-- Leave Type Master + Employee Leave Apply (UserLeaveApply)
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveType_GetList
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lt.LeaveTypeID,
        lt.LeaveTypeName,
        lt.IsActive
    FROM dbo.LeaveTypeMaster lt
    WHERE lt.LeaveTypeID IS NOT NULL
    ORDER BY lt.LeaveTypeName, lt.LeaveTypeID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveType_GetById
    @LeaveTypeID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lt.LeaveTypeID,
        lt.LeaveTypeName,
        lt.IsActive
    FROM dbo.LeaveTypeMaster lt
    WHERE lt.LeaveTypeID = @LeaveTypeID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveType_Save
    @LeaveTypeID BIGINT = NULL OUTPUT,
    @LeaveTypeName NVARCHAR(200) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF @LeaveTypeID IS NULL OR @LeaveTypeID = 0
    BEGIN
        INSERT INTO dbo.LeaveTypeMaster (LeaveTypeName, IsActive)
        VALUES (@LeaveTypeName, @IsActive);

        SET @LeaveTypeID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.LeaveTypeMaster
        SET
            LeaveTypeName = @LeaveTypeName,
            IsActive = @IsActive
        WHERE LeaveTypeID = @LeaveTypeID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveApply_GetLookups
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lt.LeaveTypeID,
        lt.LeaveTypeName
    FROM dbo.LeaveTypeMaster lt
    WHERE ISNULL(lt.IsActive, 1) = 1
    ORDER BY lt.LeaveTypeName;

    SELECT
        lp.LeavePermissionID,
        lp.LeavePermissionName
    FROM dbo.LeavePermissionMaster lp
    WHERE ISNULL(lp.IsActive, 1) = 1
    ORDER BY lp.LeavePermissionName;

    SELECT
        ay.AyID,
        ay.AyName,
        ay.FromDate,
        ay.ToDate
    FROM dbo.AyMaster ay
    WHERE ISNULL(ay.IsActive, 1) = 1
    ORDER BY ay.FromDate DESC, ay.AyID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveApply_GetNextRecordNo
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(ula.RecordNo), 0) + 1 AS NextRecordNo
    FROM dbo.UserLeaveApply ula
    WHERE ula.OrgID = @OrgID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveApply_GetList
    @OrgID BIGINT = NULL,
    @AyID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ula.UserLeaveApplyID,
        ula.OrgID,
        om.OrganizationName,
        ula.RecordNo,
        ula.TDate,
        ula.UserID,
        um.Firstname,
        um.MiddleName,
        um.LastName,
        ula.LeaveTypeID,
        ltm.LeaveTypeName,
        ula.LeaveReason,
        ula.FromDate,
        ula.ToDate,
        ula.NoOfDay,
        ula.AdminRemak,
        ula.LeavePermissionID,
        lpm.LeavePermissionName,
        ula.AyID,
        ay.AyName
    FROM dbo.UserLeaveApply ula
    LEFT JOIN dbo.OrgMaster om
        ON om.OrgID = ula.OrgID
    LEFT JOIN dbo.UserMaster um
        ON um.UserID = ula.UserID
    LEFT JOIN dbo.LeaveTypeMaster ltm
        ON ltm.LeaveTypeID = ula.LeaveTypeID
    LEFT JOIN dbo.LeavePermissionMaster lpm
        ON lpm.LeavePermissionID = ula.LeavePermissionID
    LEFT JOIN dbo.AyMaster ay
        ON ay.AyID = ula.AyID
    WHERE (@OrgID IS NULL OR ula.OrgID = @OrgID)
      AND (@AyID IS NULL OR ula.AyID = @AyID)
    ORDER BY ula.TDate DESC, ula.RecordNo DESC, ula.UserLeaveApplyID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveApply_GetById
    @UserLeaveApplyID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ula.UserLeaveApplyID,
        ula.OrgID,
        ula.RecordNo,
        ula.TDate,
        ula.UserID,
        ula.LeaveTypeID,
        ula.LeaveReason,
        ula.FromDate,
        ula.ToDate,
        ula.NoOfDay,
        ula.AdminRemak,
        ula.LeavePermissionID,
        ula.AyID
    FROM dbo.UserLeaveApply ula
    WHERE ula.UserLeaveApplyID = @UserLeaveApplyID;
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
    @AdminRemak NVARCHAR(MAX) = NULL,
    @LeavePermissionID BIGINT = NULL,
    @AyID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @NoOfDay INT = NULL;

    IF @FromDate IS NOT NULL AND @ToDate IS NOT NULL AND @ToDate >= @FromDate
        SET @NoOfDay = DATEDIFF(DAY, @FromDate, @ToDate) + 1;

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
