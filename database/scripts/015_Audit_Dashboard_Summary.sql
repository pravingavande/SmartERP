-- Audit dashboard summary: receipt vouchers, payment vouchers, donations (FY-wise)
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetDashboardSummary
    @UserID BIGINT,
    @FyID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @SansthaOrgID BIGINT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @FyName NVARCHAR(100) = N'';

    SELECT
        @UserOrgID = um.OrgID,
        @UserSchoolCode = um.SchoolCode
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT TOP 1
        @SansthaOrgID = s.OrgID
    FROM dbo.OrgMaster s
    WHERE s.Status = 1
      AND s.OrgID = s.UnderOrgID
      AND (
          s.SchoolCode = @UserSchoolCode
          OR EXISTS (
              SELECT 1
              FROM dbo.OrgMaster sch
              WHERE sch.SchoolCode = @UserSchoolCode
                AND sch.Status = 1
                AND sch.UnderOrgID = s.OrgID
          )
      )
    ORDER BY s.OrgID;

    IF @SansthaOrgID IS NULL
    BEGIN
        SELECT @SansthaOrgID = om.UnderOrgID
        FROM dbo.OrgMaster om
        WHERE om.OrgID = @UserOrgID
          AND om.Status = 1;

        IF @SansthaOrgID IS NULL
            SET @SansthaOrgID = @UserOrgID;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND (
              s.SchoolCode = @UserSchoolCode
              OR @UserOrgID = @SansthaOrgID
          )
    )
        SET @IsSansthaUser = 1;

    CREATE TABLE #UserOrgs (OrgID BIGINT NOT NULL PRIMARY KEY);

    INSERT INTO #UserOrgs (OrgID)
    SELECT DISTINCT om.OrgID
    FROM dbo.OrgMaster om
    WHERE om.Status = 1
      AND (
          (@IsSansthaUser = 1 AND (om.OrgID = @SansthaOrgID OR om.UnderOrgID = @SansthaOrgID))
          OR (@IsSansthaUser = 0 AND (om.OrgID = @UserOrgID OR om.SchoolCode = @UserSchoolCode))
      );

    IF @FyID IS NULL
    BEGIN
        SELECT TOP 1 @FyID = fy.FyID
        FROM dbo.FyMaster fy
        WHERE fy.IsActive = 1
        ORDER BY fy.FromDate DESC;
    END

    SELECT @FyName = fy.FyName
    FROM dbo.FyMaster fy
    WHERE fy.FyID = @FyID;

    SELECT
        @FyID AS FyID,
        ISNULL(@FyName, N'') AS FyName,
        ISNULL(rv.Cnt, 0) AS ReceiptVoucherCount,
        ISNULL(rv.Amt, 0) AS ReceiptVoucherAmount,
        ISNULL(pv.Cnt, 0) AS PaymentVoucherCount,
        ISNULL(pv.Amt, 0) AS PaymentVoucherAmount,
        ISNULL(dr.Cnt, 0) AS DonationCount,
        ISNULL(dr.Amt, 0) AS DonationAmount
    FROM (SELECT 1 AS x) base
    OUTER APPLY (
        SELECT
            COUNT(*) AS Cnt,
            ISNULL(SUM(v.TotalAmount), 0) AS Amt
        FROM dbo.ACVoucher v
        INNER JOIN #UserOrgs uo ON uo.OrgID = v.OrgID
        WHERE v.FyID = @FyID
          AND (v.VType = N'R' OR v.VType = N'RV')
    ) rv
    OUTER APPLY (
        SELECT
            COUNT(*) AS Cnt,
            ISNULL(SUM(v.TotalAmount), 0) AS Amt
        FROM dbo.ACVoucher v
        INNER JOIN #UserOrgs uo ON uo.OrgID = v.OrgID
        WHERE v.FyID = @FyID
          AND (v.VType = N'P' OR v.VType = N'PV')
    ) pv
    OUTER APPLY (
        SELECT
            COUNT(*) AS Cnt,
            ISNULL(SUM(dre.Amount), 0) AS Amt
        FROM dbo.DREntry dre
        INNER JOIN #UserOrgs uo ON uo.OrgID = dre.OrgID
        WHERE dre.FyID = @FyID
    ) dr;

    DROP TABLE #UserOrgs;
END
GO
