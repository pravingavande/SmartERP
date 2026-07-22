-- Audit voucher entry day limits in SoftwareSetting
-- Titles: AuditNewEntryNoOfPreviousDayAllowed, AuditEditEntryNoOfPreviousDayAllowed
-- Condition stores number of previous days allowed (0 = today only)

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SoftwareSetting_GetAuditEntryDays
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NewDays INT = 0;
    DECLARE @EditDays INT = 0;

    SELECT TOP (1) @NewDays = TRY_CAST(s.[Condition] AS INT)
    FROM dbo.SoftwareSetting s
    WHERE s.Title = N'AuditNewEntryNoOfPreviousDayAllowed'
      AND (s.UnderOrgID = @UnderOrgID OR s.UnderOrgID IS NULL)
    ORDER BY CASE WHEN s.UnderOrgID = @UnderOrgID THEN 0 ELSE 1 END, s.SrNo;

    SELECT TOP (1) @EditDays = TRY_CAST(s.[Condition] AS INT)
    FROM dbo.SoftwareSetting s
    WHERE s.Title = N'AuditEditEntryNoOfPreviousDayAllowed'
      AND (s.UnderOrgID = @UnderOrgID OR s.UnderOrgID IS NULL)
    ORDER BY CASE WHEN s.UnderOrgID = @UnderOrgID THEN 0 ELSE 1 END, s.SrNo;

    SELECT
        @UnderOrgID AS UnderOrgID,
        ISNULL(@NewDays, 0) AS NewEntryNoOfPreviousDayAllowed,
        ISNULL(@EditDays, 0) AS EditEntryNoOfPreviousDayAllowed;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_SoftwareSetting_SaveAuditEntryDays
    @UnderOrgID BIGINT,
    @NewEntryNoOfPreviousDayAllowed INT,
    @EditEntryNoOfPreviousDayAllowed INT,
    @ModifyBy NVARCHAR(1) = N'O'
AS
BEGIN
    SET NOCOUNT ON;

    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
    BEGIN
        RAISERROR(N'Under organization is required.', 16, 1);
        RETURN;
    END;

    IF @NewEntryNoOfPreviousDayAllowed < 0 OR @EditEntryNoOfPreviousDayAllowed < 0
    BEGIN
        RAISERROR(N'Day count cannot be negative.', 16, 1);
        RETURN;
    END;

    IF EXISTS (
        SELECT 1
        FROM dbo.SoftwareSetting
        WHERE Title = N'AuditNewEntryNoOfPreviousDayAllowed'
          AND UnderOrgID = @UnderOrgID
    )
    BEGIN
        UPDATE dbo.SoftwareSetting
        SET [Condition] = CONVERT(NVARCHAR(20), @NewEntryNoOfPreviousDayAllowed),
            ModifyBy = @ModifyBy
        WHERE Title = N'AuditNewEntryNoOfPreviousDayAllowed'
          AND UnderOrgID = @UnderOrgID;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.SoftwareSetting (UnderOrgID, Title, [Condition], Description, ModifyBy)
        VALUES (
            @UnderOrgID,
            N'AuditNewEntryNoOfPreviousDayAllowed',
            CONVERT(NVARCHAR(20), @NewEntryNoOfPreviousDayAllowed),
            N'Number of previous days allowed for new Payment/Receipt voucher entry (0 = today only).',
            @ModifyBy
        );
    END;

    IF EXISTS (
        SELECT 1
        FROM dbo.SoftwareSetting
        WHERE Title = N'AuditEditEntryNoOfPreviousDayAllowed'
          AND UnderOrgID = @UnderOrgID
    )
    BEGIN
        UPDATE dbo.SoftwareSetting
        SET [Condition] = CONVERT(NVARCHAR(20), @EditEntryNoOfPreviousDayAllowed),
            ModifyBy = @ModifyBy
        WHERE Title = N'AuditEditEntryNoOfPreviousDayAllowed'
          AND UnderOrgID = @UnderOrgID;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.SoftwareSetting (UnderOrgID, Title, [Condition], Description, ModifyBy)
        VALUES (
            @UnderOrgID,
            N'AuditEditEntryNoOfPreviousDayAllowed',
            CONVERT(NVARCHAR(20), @EditEntryNoOfPreviousDayAllowed),
            N'Number of previous days allowed for edit/delete of Payment/Receipt vouchers (0 = today only).',
            @ModifyBy
        );
    END;

    EXEC dbo.sp_SoftwareSetting_GetAuditEntryDays @UnderOrgID = @UnderOrgID;
END
GO

PRINT 'Software setting audit entry day procedures ready.';
GO
