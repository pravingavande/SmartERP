-- ============================================================
-- Voucher lookups: ledger/bank from VW_LedgerHeadList_* views,
-- Account Register from ACAccountRegisterMaster (no Define).
-- Does NOT modify the views.
-- ============================================================
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetLedgerHeads
    @OrgID BIGINT = NULL,
    @VType NVARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LookupOrgID BIGINT = NULL;
    DECLARE @NormalizedVType NVARCHAR(10) = UPPER(LTRIM(RTRIM(ISNULL(@VType, N''))));

    IF @OrgID IS NOT NULL AND @OrgID > 0
    BEGIN
        SET @LookupOrgID = @OrgID;

        WHILE @LookupOrgID IS NOT NULL
        BEGIN
            IF @NormalizedVType IN (N'P', N'PV')
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM dbo.VW_LedgerHeadList_Payment v
                    WHERE ISNULL(v.IsActive, 1) = 1
                      AND (v.UnderOrgID = @LookupOrgID OR v.OrgID = @LookupOrgID)
                )
                    BREAK;
            END
            ELSE
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM dbo.VW_LedgerHeadList_Receipt v
                    WHERE ISNULL(v.IsActive, 1) = 1
                      AND (v.UnderOrgID = @LookupOrgID OR v.OrgID = @LookupOrgID)
                )
                    BREAK;
            END

            SELECT @LookupOrgID = parent.UnderOrgID
            FROM dbo.OrgMaster child
            INNER JOIN dbo.OrgMaster parent ON parent.OrgID = child.UnderOrgID
            WHERE child.OrgID = @LookupOrgID
              AND child.OrgID <> ISNULL(child.UnderOrgID, 0)
              AND ISNULL(parent.IsActive, 1) = 1;

            IF @@ROWCOUNT = 0
                SET @LookupOrgID = NULL;
        END
    END

    IF @NormalizedVType IN (N'P', N'PV')
    BEGIN
        SELECT
            v.LedgerHeadID,
            v.LedgerHead,
            CAST(NULL AS NVARCHAR(200)) AS LedgerHeadEng,
            CAST(NULL AS BIGINT) AS LedgerTypeID
        FROM dbo.VW_LedgerHeadList_Payment v
        WHERE ISNULL(v.IsActive, 1) = 1
          AND (
                @LookupOrgID IS NULL
                OR v.UnderOrgID = @LookupOrgID
                OR v.OrgID = @LookupOrgID
              )
        ORDER BY v.LedgerHead;
        RETURN;
    END

    -- Default / receipt
    SELECT
        v.LedgerHeadID,
        v.LedgerHead,
        CAST(NULL AS NVARCHAR(200)) AS LedgerHeadEng,
        CAST(NULL AS BIGINT) AS LedgerTypeID
    FROM dbo.VW_LedgerHeadList_Receipt v
    WHERE ISNULL(v.IsActive, 1) = 1
      AND (
            @LookupOrgID IS NULL
            OR v.UnderOrgID = @LookupOrgID
            OR v.OrgID = @LookupOrgID
          )
    ORDER BY v.LedgerHead;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetBankLedgerHeads
    @OrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LookupOrgID BIGINT = NULL;

    IF @OrgID IS NOT NULL AND @OrgID > 0
    BEGIN
        SET @LookupOrgID = @OrgID;

        WHILE @LookupOrgID IS NOT NULL
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM dbo.VW_LedgerHeadList_Bank v
                WHERE ISNULL(v.IsActive, 1) = 1
                  AND (v.UnderOrgID = @LookupOrgID OR v.OrgID = @LookupOrgID)
            )
                BREAK;

            SELECT @LookupOrgID = parent.UnderOrgID
            FROM dbo.OrgMaster child
            INNER JOIN dbo.OrgMaster parent ON parent.OrgID = child.UnderOrgID
            WHERE child.OrgID = @LookupOrgID
              AND child.OrgID <> ISNULL(child.UnderOrgID, 0)
              AND ISNULL(parent.IsActive, 1) = 1;

            IF @@ROWCOUNT = 0
                SET @LookupOrgID = NULL;
        END
    END

    SELECT
        v.LedgerHeadID,
        v.LedgerHead,
        CAST(NULL AS NVARCHAR(200)) AS LedgerHeadEng,
        CAST(NULL AS BIGINT) AS LedgerTypeID
    FROM dbo.VW_LedgerHeadList_Bank v
    WHERE ISNULL(v.IsActive, 1) = 1
      AND (
            @LookupOrgID IS NULL
            OR v.UnderOrgID = @LookupOrgID
            OR v.OrgID = @LookupOrgID
          )
    ORDER BY v.LedgerHead;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetAccountRegisters
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
        RETURN;

    DECLARE @LookupOrgID BIGINT = @OrgID;

    -- Walk school → sanstha until AccountRegisterMaster has active rows.
    WHILE @LookupOrgID IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM dbo.ACAccountRegisterMaster arm
            WHERE arm.UnderOrgID = @LookupOrgID
              AND ISNULL(arm.IsActive, 1) = 1
        )
            BREAK;

        SELECT @LookupOrgID = parent.UnderOrgID
        FROM dbo.OrgMaster child
        INNER JOIN dbo.OrgMaster parent ON parent.OrgID = child.UnderOrgID
        WHERE child.OrgID = @LookupOrgID
          AND child.OrgID <> ISNULL(child.UnderOrgID, 0)
          AND ISNULL(parent.IsActive, 1) = 1;

        IF @@ROWCOUNT = 0
            SET @LookupOrgID = NULL;
    END

    IF @LookupOrgID IS NULL
        RETURN;

    SELECT
        arm.AccountRegisterID,
        arm.AccountRegister,
        @OrgID AS OrgID
    FROM dbo.ACAccountRegisterMaster arm
    WHERE arm.UnderOrgID = @LookupOrgID
      AND ISNULL(arm.IsActive, 1) = 1
    ORDER BY arm.SrNo, arm.AccountRegister, arm.AccountRegisterID;
END
GO
