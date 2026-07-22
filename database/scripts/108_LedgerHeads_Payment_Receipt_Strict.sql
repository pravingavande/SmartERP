-- ============================================================
-- Payment / Receipt voucher ledger head dropdowns ONLY.
-- Ledger heads are stored against Sanstha (UnderOrgID).
-- Resolve sanstha once from OrgMaster for the selected school;
-- no parent-org walk / fallback.
-- Does NOT change sp_Audit_GetBankLedgerHeads or any other SP.
-- ============================================================
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetLedgerHeads
    @OrgID BIGINT = NULL,
    @VType NVARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NormalizedVType NVARCHAR(10) = UPPER(LTRIM(RTRIM(ISNULL(@VType, N''))));
    DECLARE @SansthaOrgID BIGINT = NULL;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        SELECT
            CAST(NULL AS BIGINT) AS LedgerHeadID,
            CAST(NULL AS NVARCHAR(200)) AS LedgerHead,
            CAST(NULL AS NVARCHAR(200)) AS LedgerHeadEng,
            CAST(NULL AS BIGINT) AS LedgerTypeID
        WHERE 1 = 0;
        RETURN;
    END

    -- Selected org is usually a school: use its sanstha (UnderOrgID).
    -- If the org is sanstha itself, use that org id.
    SELECT @SansthaOrgID = CASE
        WHEN om.UnderOrgID IS NOT NULL
         AND om.UnderOrgID > 0
         AND om.UnderOrgID <> om.OrgID
            THEN om.UnderOrgID
        ELSE om.OrgID
    END
    FROM dbo.OrgMaster om
    WHERE om.OrgID = @OrgID
      AND ISNULL(om.IsActive, 1) = 1;

    IF @SansthaOrgID IS NULL OR @SansthaOrgID <= 0
    BEGIN
        SELECT
            CAST(NULL AS BIGINT) AS LedgerHeadID,
            CAST(NULL AS NVARCHAR(200)) AS LedgerHead,
            CAST(NULL AS NVARCHAR(200)) AS LedgerHeadEng,
            CAST(NULL AS BIGINT) AS LedgerTypeID
        WHERE 1 = 0;
        RETURN;
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
                v.UnderOrgID = @SansthaOrgID
                OR v.OrgID = @SansthaOrgID
              )
        ORDER BY v.LedgerHead;
        RETURN;
    END

    -- Receipt voucher (R / RV) and default receipt path
    SELECT
        v.LedgerHeadID,
        v.LedgerHead,
        CAST(NULL AS NVARCHAR(200)) AS LedgerHeadEng,
        CAST(NULL AS BIGINT) AS LedgerTypeID
    FROM dbo.VW_LedgerHeadList_Receipt v
    WHERE ISNULL(v.IsActive, 1) = 1
      AND (
            v.UnderOrgID = @SansthaOrgID
            OR v.OrgID = @SansthaOrgID
          )
    ORDER BY v.LedgerHead;
END
GO

PRINT '108_LedgerHeads_Payment_Receipt_Strict applied (sanstha scope, no fallback).';
GO
