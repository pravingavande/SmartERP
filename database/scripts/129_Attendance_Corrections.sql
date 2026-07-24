-- Attendance corrections: reverse check-in/out, force check-out + admin audit log
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.AttendanceAdminAction', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceAdminAction (
        AdminActionID BIGINT IDENTITY(1, 1) NOT NULL,
        OrgID         BIGINT         NOT NULL,
        AttendanceID  BIGINT         NOT NULL,
        UserID        BIGINT         NOT NULL,
        ActionType    NVARCHAR(40)   NOT NULL,
        EventType     NVARCHAR(20)   NOT NULL,
        Reason        NVARCHAR(500)  NULL,
        PerformedBy   BIGINT         NOT NULL,
        PerformedAt   DATETIME2      NOT NULL CONSTRAINT DF_AttendanceAdminAction_PerformedAt DEFAULT (SYSUTCDATETIME()),
        MetaJson      NVARCHAR(MAX)  NULL,
        CONSTRAINT PK_AttendanceAdminAction PRIMARY KEY CLUSTERED (AdminActionID)
    );

    CREATE NONCLUSTERED INDEX IX_AttendanceAdminAction_Org_PerformedAt ON dbo.AttendanceAdminAction (OrgID, PerformedAt DESC);
    CREATE NONCLUSTERED INDEX IX_AttendanceAdminAction_AttendanceID ON dbo.AttendanceAdminAction (AttendanceID);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceRecord_Reverse
    @AttendanceID BIGINT,
    @OrgID BIGINT,
    @EventType NVARCHAR(20),
    @PerformedBy BIGINT,
    @Reason NVARCHAR(500),
    @MetaJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @UserID BIGINT;

    SELECT @UserID = ar.UserID
    FROM dbo.AttendanceRecord ar
    WHERE ar.AttendanceID = @AttendanceID
      AND ar.OrgID = @OrgID;

    IF @UserID IS NULL
    BEGIN
        RAISERROR('Attendance record not found.', 16, 1);
        RETURN;
    END

    IF @EventType = N'check_in'
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM dbo.AttendanceRecord ar
            WHERE ar.AttendanceID = @AttendanceID AND ar.OrgID = @OrgID AND ar.CheckInTime IS NOT NULL
        )
        BEGIN
            RAISERROR('No check-in to reverse.', 16, 1);
            RETURN;
        END

        UPDATE dbo.AttendanceRecord
        SET CheckInTime = NULL,
            CheckInLatitude = NULL,
            CheckInLongitude = NULL,
            CheckInPhotoPath = NULL,
            CheckInMethod = NULL,
            CheckInDeviceID = NULL,
            CheckInConfirmed = 1,
            CheckOutTime = NULL,
            CheckOutLatitude = NULL,
            CheckOutLongitude = NULL,
            CheckOutPhotoPath = NULL,
            CheckOutMethod = NULL,
            CheckOutDeviceID = NULL,
            CheckOutConfirmed = 1,
            ModifiedOn = SYSUTCDATETIME()
        WHERE AttendanceID = @AttendanceID
          AND OrgID = @OrgID;
    END
    ELSE IF @EventType = N'check_out'
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM dbo.AttendanceRecord ar
            WHERE ar.AttendanceID = @AttendanceID AND ar.OrgID = @OrgID AND ar.CheckOutTime IS NOT NULL
        )
        BEGIN
            RAISERROR('No check-out to reverse.', 16, 1);
            RETURN;
        END

        UPDATE dbo.AttendanceRecord
        SET CheckOutTime = NULL,
            CheckOutLatitude = NULL,
            CheckOutLongitude = NULL,
            CheckOutPhotoPath = NULL,
            CheckOutMethod = NULL,
            CheckOutDeviceID = NULL,
            CheckOutConfirmed = 1,
            ModifiedOn = SYSUTCDATETIME()
        WHERE AttendanceID = @AttendanceID
          AND OrgID = @OrgID;
    END
    ELSE
    BEGIN
        RAISERROR('eventType must be check_in or check_out.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.AttendanceAdminAction (
        OrgID, AttendanceID, UserID, ActionType, EventType, Reason, PerformedBy, MetaJson
    )
    VALUES (
        @OrgID, @AttendanceID, @UserID, N'reverse', @EventType, @Reason, @PerformedBy, @MetaJson
    );
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AttendanceRecord_ForceCheckout
    @AttendanceID BIGINT,
    @OrgID BIGINT,
    @CheckoutAt DATETIME2,
    @PerformedBy BIGINT,
    @Reason NVARCHAR(500),
    @MetaJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @UserID BIGINT;
    DECLARE @CheckInTime DATETIME2;

    SELECT
        @UserID = ar.UserID,
        @CheckInTime = ar.CheckInTime
    FROM dbo.AttendanceRecord ar
    WHERE ar.AttendanceID = @AttendanceID
      AND ar.OrgID = @OrgID;

    IF @UserID IS NULL
    BEGIN
        RAISERROR('Attendance record not found.', 16, 1);
        RETURN;
    END

    IF @CheckInTime IS NULL
    BEGIN
        RAISERROR('Employee has not checked in.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1 FROM dbo.AttendanceRecord ar
        WHERE ar.AttendanceID = @AttendanceID AND ar.OrgID = @OrgID AND ISNULL(ar.CheckInConfirmed, 1) = 0
    )
    BEGIN
        RAISERROR('Check-in is pending confirmation. Confirm check-in before force check-out.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1 FROM dbo.AttendanceRecord ar
        WHERE ar.AttendanceID = @AttendanceID AND ar.OrgID = @OrgID AND ar.CheckOutTime IS NOT NULL
    )
    BEGIN
        RAISERROR('Employee already has a check-out on this record.', 16, 1);
        RETURN;
    END

    IF @CheckoutAt <= @CheckInTime
    BEGIN
        RAISERROR('Check-out time must be after check-in time.', 16, 1);
        RETURN;
    END

    UPDATE dbo.AttendanceRecord
    SET CheckOutTime = @CheckoutAt,
        CheckOutLatitude = CheckInLatitude,
        CheckOutLongitude = CheckInLongitude,
        CheckOutPhotoPath = NULL,
        CheckOutMethod = N'admin',
        CheckOutDeviceID = NULL,
        CheckOutConfirmed = 1,
        ModifiedOn = SYSUTCDATETIME()
    WHERE AttendanceID = @AttendanceID
      AND OrgID = @OrgID;

    INSERT INTO dbo.AttendanceAdminAction (
        OrgID, AttendanceID, UserID, ActionType, EventType, Reason, PerformedBy, MetaJson
    )
    VALUES (
        @OrgID, @AttendanceID, @UserID, N'force_checkout', N'check_out', @Reason, @PerformedBy, @MetaJson
    );
END
GO

PRINT '129_Attendance_Corrections applied.';
GO
