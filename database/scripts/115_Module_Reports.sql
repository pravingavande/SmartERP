-- Module Reports: Audit, School/College, Stock (RDLC data sources)
-- Aligned to live view/base-table columns (vw_* schemas differ from dev assumptions).
USE SmartERP;
GO

/* ========== 1.1 Voucher Ledger Report ========== */

CREATE OR ALTER PROCEDURE dbo.sp_VoucherLedger_GetReport
    @OrgID BIGINT,
    @LedgerHeadID BIGINT = NULL,
    @AllLedgerHeads BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('OrgID is required for Voucher Ledger report.', 16, 1);
        RETURN;
    END;

    DECLARE @LedgerHeadName NVARCHAR(255) = NULL;
    IF @LedgerHeadID IS NOT NULL AND @LedgerHeadID > 0
    BEGIN
        SELECT @LedgerHeadName = LTRIM(RTRIM(lh.LedgerHead))
        FROM dbo.ACLedgerHeadMaster lh
        WHERE lh.LedgerHeadID = @LedgerHeadID;
    END;

    SELECT
        o.OrgID,
        o.OrganizationName,
        ISNULL(NULLIF(LTRIM(RTRIM(o.Address)), ''), '') AS Address,
        ISNULL(NULLIF(LTRIM(RTRIM(o.CityName)), ''), '') AS CityName
    FROM dbo.OrgMaster o
    WHERE o.OrgID = @OrgID;

    SELECT
        ISNULL(NULLIF(LTRIM(RTRIM(v.LedgerHead)), ''), N'—') AS LedgerHead,
        ISNULL(lh.LedgerHeadID, 0) AS LedgerHeadID,
        CAST(v.VDate AS DATE) AS VDate,
        v.VCode,
        v.VType,
        ISNULL(NULLIF(LTRIM(RTRIM(v.LedgerHeadNarration)), ''), N'') AS LedgerHeadNarration,
        ISNULL(v.Amount, 0) AS Amount,
        v.VoucherID
    FROM dbo.vw_VoucherDetailsReport v
    LEFT JOIN dbo.ACLedgerHeadMaster lh
        ON LTRIM(RTRIM(lh.LedgerHead)) = LTRIM(RTRIM(v.LedgerHead))
    WHERE v.OrgID = @OrgID
      AND (
            @AllLedgerHeads = 1
            OR @LedgerHeadID IS NULL
            OR @LedgerHeadID <= 0
            OR (
                @LedgerHeadName IS NOT NULL
                AND LTRIM(RTRIM(v.LedgerHead)) = @LedgerHeadName
            )
          )
    ORDER BY
        ISNULL(NULLIF(LTRIM(RTRIM(v.LedgerHead)), ''), N'—'),
        CAST(v.VDate AS DATE),
        v.VCode,
        v.VoucherID;
END
GO

/* ========== 1.2 Trial Balance ========== */

CREATE OR ALTER PROCEDURE dbo.sp_TrialBalance_GetReport
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('OrgID is required for Trial Balance report.', 16, 1);
        RETURN;
    END;

    SELECT
        o.OrgID,
        o.OrganizationName,
        ISNULL(NULLIF(LTRIM(RTRIM(o.Address)), ''), '') AS Address,
        ISNULL(NULLIF(LTRIM(RTRIM(o.CityName)), ''), '') AS CityName
    FROM dbo.OrgMaster o
    WHERE o.OrgID = @OrgID;

    ;WITH Lines AS (
        SELECT
            ISNULL(NULLIF(LTRIM(RTRIM(v.LedgerHead)), ''), N'—') AS LedgerHead,
            ISNULL(v.Amount, 0) AS Amount,
            UPPER(LTRIM(RTRIM(ISNULL(v.VType, N'')))) AS VTypeNorm
        FROM dbo.vw_VoucherDetailsReport v
        WHERE v.OrgID = @OrgID
    )
    SELECT
        LedgerHead,
        CAST(0 AS DECIMAL(18, 2)) AS OpeningBalance,
        SUM(CASE
            WHEN VTypeNorm IN (N'P', N'PAYMENT', N'PV', N'BW') THEN Amount
            ELSE 0
        END) AS Debit,
        SUM(CASE
            WHEN VTypeNorm IN (N'R', N'RECEIPT', N'RV', N'BD') THEN Amount
            ELSE 0
        END) AS Credit,
        SUM(CASE
            WHEN VTypeNorm IN (N'R', N'RECEIPT', N'RV', N'BD') THEN Amount
            WHEN VTypeNorm IN (N'P', N'PAYMENT', N'PV', N'BW') THEN -Amount
            ELSE 0
        END) AS ClosingBalance
    FROM Lines
    GROUP BY LedgerHead
    ORDER BY LedgerHead;
END
GO

/* ========== 2.1 School / College Report ========== */
-- vw_SchoolDetailsReport on live has a different column set; use OrgMaster joins (same data).

CREATE OR ALTER PROCEDURE dbo.sp_SchoolDetails_GetReport
    @SansthaID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @SansthaID IS NULL OR @SansthaID <= 0
    BEGIN
        RAISERROR('Sanstha is required for School / College report.', 16, 1);
        RETURN;
    END;

    SELECT
        sanstha.OrganizationName AS SansthaName,
        ISNULL(NULLIF(LTRIM(RTRIM(sanstha.Address)), ''), '') AS SansthaAddress
    FROM dbo.OrgMaster sanstha
    WHERE sanstha.OrgID = @SansthaID;

    SELECT
        om.SrNo,
        om.OrganizationName,
        bc.CategoryName AS BusinessCategoryName,
        sc.SchoolCategoryName,
        om.Address,
        om.CityName,
        om.UDiesNo,
        om.SharlarthID,
        om.SchoolTinNo,
        om.PanNo,
        om.PhoneNo,
        om.MobileNo,
        om.EmailID,
        om.EstablishmentYear,
        om.RegNo,
        om.Permission80G,
        CASE WHEN ISNULL(om.IsActive, 1) = 1 THEN N'Active' ELSE N'Inactive' END AS StatusText
    FROM dbo.OrgMaster om
    LEFT JOIN dbo.BusinessCategoryMaster bc ON bc.BusinessCategoryID = om.BusinessCategoryID
    LEFT JOIN dbo.SchoolCategoryMaster sc ON sc.SchoolCategoryID = om.SchoolCategoryID
    WHERE om.UnderOrgID = @SansthaID
       OR om.OrgID = @SansthaID
    ORDER BY om.SrNo, om.OrganizationName;
END
GO

/* ========== 2.2–2.4 Employee Reports (shared base) ========== */
-- vw_UserDetailReport on live has a different column set; use UserMaster joins (Teacher Master scope).

CREATE OR ALTER PROCEDURE dbo.sp_UserDetail_GetReport
    @OrgID BIGINT = NULL,
    @SansthaID BIGINT = NULL,
    @ReportMode NVARCHAR(20) = N'ALL' -- ALL | SENIORITY | RETIRED
AS
BEGIN
    SET NOCOUNT ON;

    IF (@OrgID IS NULL OR @OrgID <= 0) AND (@SansthaID IS NULL OR @SansthaID <= 0)
    BEGIN
        RAISERROR('School or Sanstha is required for Employee report.', 16, 1);
        RETURN;
    END;

    IF @OrgID IS NOT NULL AND @OrgID > 0 AND @SansthaID IS NOT NULL AND @SansthaID > 0
    BEGIN
        RAISERROR('Specify either School or Sanstha, not both.', 16, 1);
        RETURN;
    END;

    DECLARE @ScopeName NVARCHAR(255) = N'';
    IF @OrgID IS NOT NULL AND @OrgID > 0
        SELECT @ScopeName = OrganizationName FROM dbo.OrgMaster WHERE OrgID = @OrgID;
    ELSE
        SELECT @ScopeName = OrganizationName FROM dbo.OrgMaster WHERE OrgID = @SansthaID;

    SELECT @ScopeName AS ScopeName;

    SELECT
        um.SrNo,
        um.EmployeeName,
        dm.DesignationName,
        om.OrganizationName,
        sanstha.OrganizationName AS SansthaName,
        um.MobileNo1,
        um.EmailID,
        um.ShalarthID,
        um.DateOfWorkingStart,
        um.ServiceOutDate,
        st.StaffTypeName,
        ur.UserRoleName
    FROM dbo.UserMaster um
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = um.OrgID AND ISNULL(om.IsActive, 1) = 1
    LEFT JOIN dbo.OrgMaster sanstha ON sanstha.OrgID = om.UnderOrgID
    LEFT JOIN dbo.DesignationMaster dm ON dm.DesignationID = um.DesignationID
    LEFT JOIN dbo.UserRoleMaster ur ON ur.UserRoleID = um.UserRoleID
    LEFT JOIN dbo.StaffTypeMaster st ON st.StaffTypeID = um.StaffTypeID
    WHERE (
            um.StaffTypeID IN (1, 2)
            OR (
                um.StaffTypeID IS NULL
                AND (
                    NULLIF(LTRIM(RTRIM(um.SubjectName1)), N'') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(um.SubjectName2)), N'') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(um.SubjectName3)), N'') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(um.SQualification)), N'') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(um.BQualification)), N'') IS NOT NULL
                )
            )
            OR ISNULL(um.StaffTypeID, 0) > 2
        )
      AND ISNULL(ur.UserRoleName, N'') <> N'SuperAdmin'
      AND ISNULL(um.UserRoleID, 0) <> 5
      AND (
            (@OrgID IS NOT NULL AND @OrgID > 0 AND um.OrgID = @OrgID)
            OR (
                @SansthaID IS NOT NULL AND @SansthaID > 0
                AND EXISTS (
                    SELECT 1
                    FROM dbo.OrgMaster omScope
                    WHERE omScope.OrgID = um.OrgID
                      AND ISNULL(omScope.IsActive, 1) = 1
                      AND (
                            omScope.OrgID = @SansthaID
                            OR omScope.UnderOrgID = @SansthaID
                          )
                )
            )
          )
      AND (
            @ReportMode <> N'RETIRED'
            OR UPPER(LTRIM(RTRIM(ISNULL(CAST(um.CloseFlag AS NVARCHAR(20)), N'')))) IN (N'1', N'Y', N'TRUE', N'T')
            OR um.ServiceOutDate IS NOT NULL
            OR ISNULL(um.IsActive, 1) = 0
          )
    ORDER BY
        CASE WHEN @ReportMode = N'SENIORITY' THEN 0 ELSE 1 END,
        CASE WHEN @ReportMode = N'SENIORITY' THEN um.DateOfWorkingStart END ASC,
        om.OrganizationName,
        um.SrNo,
        um.EmployeeName;
END
GO

/* ========== 2.5 Inward Register Report ========== */

CREATE OR ALTER PROCEDURE dbo.sp_InwardRegister_GetReport
    @FromDate DATE,
    @ToDate DATE,
    @OrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @FromDate IS NULL OR @ToDate IS NULL
    BEGIN
        RAISERROR('FromDate and ToDate are required for Inward Register report.', 16, 1);
        RETURN;
    END;

    SELECT
        v.RecordNo,
        CAST(v.IRDate AS DATE) AS IRDate,
        v.FileNo,
        v.LetterNo,
        v.FromWhomReceived,
        v.Subject,
        v.ToWhomIssued,
        v.OrganizationName,
        v.Remark
    FROM dbo.vw_InwardRegisterReport v
    WHERE CAST(v.IRDate AS DATE) >= @FromDate
      AND CAST(v.IRDate AS DATE) <= @ToDate
      AND (@OrgID IS NULL OR @OrgID <= 0 OR v.OrgID = @OrgID)
    ORDER BY CAST(v.IRDate AS DATE), v.RecordNo;
END
GO

/* ========== 2.6 Outward Register Report ========== */

CREATE OR ALTER PROCEDURE dbo.sp_OutwardRegister_GetReport
    @FromDate DATE,
    @ToDate DATE,
    @OrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @FromDate IS NULL OR @ToDate IS NULL
    BEGIN
        RAISERROR('FromDate and ToDate are required for Outward Register report.', 16, 1);
        RETURN;
    END;

    SELECT
        v.RecordNo,
        CAST(v.ORDate AS DATE) AS ORDate,
        v.FileNo,
        v.Subject,
        v.Address,
        v.Enclosures,
        v.OrganizationName,
        v.Remark
    FROM dbo.vw_OutwardRegisterReport v
    WHERE CAST(v.ORDate AS DATE) >= @FromDate
      AND CAST(v.ORDate AS DATE) <= @ToDate
      AND (@OrgID IS NULL OR @OrgID <= 0 OR v.OrgID = @OrgID)
    ORDER BY CAST(v.ORDate AS DATE), v.RecordNo;
END
GO

/* ========== 3.1 Stock Register ========== */
-- Live vw_StockRegisterDetail: StockID, OrgID, OrganizationName, ItemID, ItemName,
-- ItemGroupID, ItemGroupName, SrNo, Qty, Rate, Amount, Remark

CREATE OR ALTER PROCEDURE dbo.sp_StockRegister_GetReport
    @OrgID BIGINT,
    @ItemGroupID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('OrgID is required for Stock Register report.', 16, 1);
        RETURN;
    END;

    SELECT
        o.OrgID,
        o.OrganizationName,
        ISNULL(NULLIF(LTRIM(RTRIM(o.Address)), ''), '') AS Address,
        ISNULL(NULLIF(LTRIM(RTRIM(o.CityName)), ''), '') AS CityName
    FROM dbo.OrgMaster o
    WHERE o.OrgID = @OrgID;

    SELECT
        v.ItemGroupName,
        v.ItemName,
        CAST(0 AS DECIMAL(18, 2)) AS OpeningQty,
        SUM(ISNULL(v.Qty, 0)) AS InwardQty,
        CAST(0 AS DECIMAL(18, 2)) AS OutwardQty,
        SUM(ISNULL(v.Qty, 0)) AS ClosingQty
    FROM dbo.vw_StockRegisterDetail v
    WHERE v.OrgID = @OrgID
      AND (@ItemGroupID IS NULL OR @ItemGroupID <= 0 OR v.ItemGroupID = @ItemGroupID)
    GROUP BY
        v.ItemGroupID,
        v.ItemGroupName,
        v.ItemID,
        v.ItemName
    ORDER BY v.ItemGroupName, v.ItemName;
END
GO

PRINT '115_Module_Reports applied.';
GO
