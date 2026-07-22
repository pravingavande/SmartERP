-- Ledger narration: org-scoped save + searchable list by OrgID and LedgerHeadID

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetLedgerNarrations
    @LedgerHeadID BIGINT,
    @OrgID BIGINT,
    @Search NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Term NVARCHAR(502) = NULL;
    IF @Search IS NOT NULL AND LEN(LTRIM(RTRIM(@Search))) > 0
        SET @Term = N'%' + LTRIM(RTRIM(@Search)) + N'%';

    SELECT DISTINCT
        n.LedgerHeadNarration
    FROM dbo.ACLedgerHeadNarration n
    WHERE n.LedgerHeadID = @LedgerHeadID
      AND n.OrgID = @OrgID
      AND ISNULL(n.IsActive, 1) = 1
      AND n.LedgerHeadNarration IS NOT NULL
      AND LEN(LTRIM(RTRIM(n.LedgerHeadNarration))) > 0
      AND (@Term IS NULL OR n.LedgerHeadNarration LIKE @Term)
    ORDER BY n.LedgerHeadNarration;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_SaveLedgerNarration
    @LedgerHeadID BIGINT,
    @OrgID BIGINT,
    @LedgerHeadNarration NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR(N'Organization is required.', 16, 1);
        RETURN;
    END;

    IF @LedgerHeadID IS NULL OR @LedgerHeadID = 0
    BEGIN
        RAISERROR(N'Ledger head is required.', 16, 1);
        RETURN;
    END;

    IF @LedgerHeadNarration IS NULL OR LEN(LTRIM(RTRIM(@LedgerHeadNarration))) = 0
        RETURN;

    SET @LedgerHeadNarration = LTRIM(RTRIM(@LedgerHeadNarration));

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.ACLedgerHeadNarration n
        WHERE n.LedgerHeadID = @LedgerHeadID
          AND n.LedgerHeadNarration = @LedgerHeadNarration
          AND n.OrgID = @OrgID
    )
    BEGIN
        INSERT INTO dbo.ACLedgerHeadNarration (OrgID, LedgerHeadNarration, LedgerHeadID, IsActive)
        VALUES (@OrgID, @LedgerHeadNarration, @LedgerHeadID, 1);
    END
END
GO

PRINT 'Ledger narration org-scoped procedures ready.';
GO
