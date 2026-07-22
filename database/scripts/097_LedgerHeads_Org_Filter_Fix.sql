-- ============================================================
-- Fix Receipt/Payment Ledger Head dropdowns: when org has no
-- matching ledger heads, return empty list instead of all heads
-- from other orgs. Mirrors 083_Bank_LedgerHeads_Org_Filter_Fix.
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
    DECLARE @OrgRequested BIT = 0;
    DECLARE @NormalizedVType NVARCHAR(10) = UPPER(LTRIM(RTRIM(ISNULL(@VType, N''))));

    IF @OrgID IS NOT NULL AND @OrgID > 0
    BEGIN
        SET @OrgRequested = 1;
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
          AND @OrgRequested = 1
          AND @LookupOrgID IS NOT NULL
          AND (
                v.UnderOrgID = @LookupOrgID
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
      AND @OrgRequested = 1
      AND @LookupOrgID IS NOT NULL
      AND (
            v.UnderOrgID = @LookupOrgID
            OR v.OrgID = @LookupOrgID
          )
    ORDER BY v.LedgerHead;
END
GO

PRINT '097_LedgerHeads_Org_Filter_Fix applied.';
GO
