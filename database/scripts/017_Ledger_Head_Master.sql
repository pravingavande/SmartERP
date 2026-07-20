-- Ledger Head Master CRUD + ledger type lookup
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetLedgerTypes
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lt.LedgerTypeID,
        lt.LedgerType
    FROM dbo.ACLedgerTypeMaster lt
    WHERE lt.IsActive = 1
    ORDER BY lt.SrNo, lt.LedgerTypeID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_LedgerHead_GetList
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lh.LedgerHeadID,
        lh.UnderOrgID,
        lh.SrNo,
        lh.LedgerHead,
        lh.LedgerHeadEng,
        lh.Description,
        lh.LedgerTypeID,
        lh.IsActive,
        lt.LedgerType
    FROM dbo.ACLedgerHeadMaster lh
    LEFT JOIN dbo.ACLedgerTypeMaster lt ON lt.LedgerTypeID = lh.LedgerTypeID
    WHERE lh.UnderOrgID = @UnderOrgID
    ORDER BY lh.SrNo, lh.LedgerHeadID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_LedgerHead_GetById
    @LedgerHeadID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lh.LedgerHeadID,
        lh.UnderOrgID,
        lh.SrNo,
        lh.LedgerHead,
        lh.LedgerHeadEng,
        lh.Description,
        lh.LedgerTypeID,
        lh.IsActive,
        lt.LedgerType
    FROM dbo.ACLedgerHeadMaster lh
    LEFT JOIN dbo.ACLedgerTypeMaster lt ON lt.LedgerTypeID = lh.LedgerTypeID
    WHERE lh.LedgerHeadID = @LedgerHeadID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_LedgerHead_GetNextSrNo
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NextSrNo BIGINT;

    SELECT @NextSrNo = ISNULL(MAX(lh.SrNo), 0) + 1
    FROM dbo.ACLedgerHeadMaster lh
    WHERE lh.UnderOrgID = @UnderOrgID;

    SELECT ISNULL(@NextSrNo, 1) AS NextSrNo;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_LedgerHead_Save
    @LedgerHeadID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @LedgerHead NVARCHAR(200),
    @LedgerHeadEng NVARCHAR(100) = NULL,
    @Description NVARCHAR(MAX) = NULL,
    @LedgerTypeID BIGINT,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @LedgerHeadID IS NULL OR @LedgerHeadID = 0
    BEGIN
        DECLARE @SrNo BIGINT;

        SELECT @SrNo = ISNULL(MAX(lh.SrNo), 0) + 1
        FROM dbo.ACLedgerHeadMaster lh
        WHERE lh.UnderOrgID = @UnderOrgID;

        INSERT INTO dbo.ACLedgerHeadMaster (
            UnderOrgID,
            SrNo,
            LedgerHead,
            LedgerHeadEng,
            Description,
            LedgerTypeID,
            IsActive
        )
        VALUES (
            @UnderOrgID,
            @SrNo,
            @LedgerHead,
            @LedgerHeadEng,
            @Description,
            @LedgerTypeID,
            @IsActive
        );

        SET @LedgerHeadID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.ACLedgerHeadMaster
        SET LedgerHead = @LedgerHead,
            LedgerHeadEng = @LedgerHeadEng,
            Description = @Description,
            LedgerTypeID = @LedgerTypeID,
            IsActive = @IsActive
        WHERE LedgerHeadID = @LedgerHeadID;
    END
END
GO

-- Fix voucher lookups to use LedgerHeadID (LedgerHeadCode column removed)
CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetLedgerHeads
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lh.LedgerHeadID,
        lh.LedgerHead,
        lh.LedgerHeadEng,
        lh.LedgerTypeID
    FROM dbo.ACLedgerHeadMaster lh
    WHERE lh.IsActive = 1
    ORDER BY lh.LedgerHead;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetBankLedgerHeads
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lh.LedgerHeadID,
        lh.LedgerHead,
        lh.LedgerHeadEng
    FROM dbo.ACLedgerHeadMaster lh
    INNER JOIN dbo.ACLedgerTypeMaster lt ON lt.LedgerTypeID = lh.LedgerTypeID
    WHERE lh.IsActive = 1
      AND lt.BankFlag = N'Y'
    ORDER BY lh.LedgerHead;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_Voucher_GetDetails
    @VoucherID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        d.VoucherDetailID,
        d.VoucherID,
        d.SrNo,
        d.LedgerHeadID,
        d.LedgerHeadNarration,
        d.Amount,
        lh.LedgerHead
    FROM dbo.ACVoucherDetail d
    LEFT JOIN dbo.ACLedgerHeadMaster lh ON lh.LedgerHeadID = d.LedgerHeadID
    WHERE d.VoucherID = @VoucherID
    ORDER BY d.SrNo;
END
GO
