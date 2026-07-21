-- ============================================================
-- Fix Deposit Bank dropdown: when org has no bank ledger heads,
-- return empty list instead of all banks from other orgs.
-- ============================================================
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetBankLedgerHeads
    @OrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LookupOrgID BIGINT = NULL;
    DECLARE @OrgRequested BIT = 0;

    IF @OrgID IS NOT NULL AND @OrgID > 0
    BEGIN
        SET @OrgRequested = 1;
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
      AND @OrgRequested = 1
      AND @LookupOrgID IS NOT NULL
      AND (
            v.UnderOrgID = @LookupOrgID
            OR v.OrgID = @LookupOrgID
          )
    ORDER BY v.LedgerHead;
END
GO

PRINT '083_Bank_LedgerHeads_Org_Filter_Fix applied.';
GO
