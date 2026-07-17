-- Audit Dashboard Tab 2: Cash Summary (org-wise Receipt/Payment periods + Cash in Hand/Bank)
-- Live schema: UserRoleID / IsActive (aligned with 041_Live_Schema_Align_Procedures.sql)
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetCashSummary
    @UserID BIGINT,
    @FyID BIGINT = NULL,
    @OrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @SansthaOrgID BIGINT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @Today DATE = CAST(GETDATE() AS DATE);
    DECLARE @PrevDay DATE = DATEADD(DAY, -1, @Today);
    DECLARE @WeekStart DATE;
    DECLARE @MonthStart DATE = DATEFROMPARTS(YEAR(@Today), MONTH(@Today), 1);
    DECLARE @FyFrom DATE;
    DECLARE @FyTo DATE;
    DECLARE @Dow INT;

    SET @Dow = DATEPART(WEEKDAY, @Today); -- 1=Sunday .. 7=Saturday
    SET @WeekStart = DATEADD(DAY, CASE WHEN @Dow = 1 THEN -6 ELSE 2 - @Dow END, @Today);

    SELECT
        @UserOrgID = um.OrgID,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT @SansthaOrgID = om.UnderOrgID
    FROM dbo.OrgMaster om
    WHERE om.OrgID = @UserOrgID
      AND ISNULL(om.IsActive, 1) = 1;

    IF @SansthaOrgID IS NULL
        SET @SansthaOrgID = @UserOrgID;

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND ISNULL(s.IsActive, 1) = 1
    )
    AND (
        @UserOrgID = @SansthaOrgID
        OR @UserRoleID IN (1, 2)
    )
        SET @IsSansthaUser = 1;

    IF @FyID IS NULL
    BEGIN
        SELECT TOP 1 @FyID = fy.FyID
        FROM dbo.FyMaster fy
        WHERE fy.IsActive = 1
        ORDER BY fy.FromDate DESC;
    END

    SELECT
        @FyFrom = CAST(fy.FromDate AS DATE),
        @FyTo = CAST(fy.ToDate AS DATE)
    FROM dbo.FyMaster fy
    WHERE fy.FyID = @FyID;

    IF @FyFrom IS NULL SET @FyFrom = @Today;
    IF @FyTo IS NULL SET @FyTo = @Today;

    IF @Today > @FyTo SET @Today = @FyTo;
    IF @PrevDay < @FyFrom SET @PrevDay = @FyFrom;
    IF @PrevDay > @Today SET @PrevDay = @Today;
    IF @WeekStart < @FyFrom SET @WeekStart = @FyFrom;
    IF @WeekStart > @Today SET @WeekStart = @Today;
    IF @MonthStart < @FyFrom SET @MonthStart = @FyFrom;
    IF @MonthStart > @Today SET @MonthStart = @Today;

    CREATE TABLE #UserOrgs (
        OrgID BIGINT NOT NULL PRIMARY KEY,
        OrganizationName NVARCHAR(300) NOT NULL
    );

    INSERT INTO #UserOrgs (OrgID, OrganizationName)
    SELECT DISTINCT
        om.OrgID,
        om.OrganizationName
    FROM dbo.OrgMaster om
    WHERE ISNULL(om.IsActive, 1) = 1
      AND (
          (@IsSansthaUser = 1 AND (om.OrgID = @SansthaOrgID OR om.UnderOrgID = @SansthaOrgID))
          OR (@IsSansthaUser = 0 AND om.OrgID = @UserOrgID)
      )
      AND (
          @OrgID IS NULL
          OR om.OrgID = @OrgID
          OR om.UnderOrgID = @OrgID
      );

    -- Result set 1: Receipt / Payment period amounts (org-wise)
    SELECT
        uo.OrgID,
        uo.OrganizationName,
        ISNULL(SUM(CASE WHEN v.VType IN (N'R', N'RV') AND CAST(v.VDate AS DATE) = @Today THEN v.TotalAmount ELSE 0 END), 0) AS ReceiptToday,
        ISNULL(SUM(CASE WHEN v.VType IN (N'R', N'RV') AND CAST(v.VDate AS DATE) = @PrevDay THEN v.TotalAmount ELSE 0 END), 0) AS ReceiptPreviousDay,
        ISNULL(SUM(CASE WHEN v.VType IN (N'R', N'RV') AND CAST(v.VDate AS DATE) >= @WeekStart AND CAST(v.VDate AS DATE) <= @Today THEN v.TotalAmount ELSE 0 END), 0) AS ReceiptCurrentWeek,
        ISNULL(SUM(CASE WHEN v.VType IN (N'R', N'RV') AND CAST(v.VDate AS DATE) >= @MonthStart AND CAST(v.VDate AS DATE) <= @Today THEN v.TotalAmount ELSE 0 END), 0) AS ReceiptCurrentMonth,
        ISNULL(SUM(CASE WHEN v.VType IN (N'R', N'RV') THEN v.TotalAmount ELSE 0 END), 0) AS ReceiptCurrentFy,
        ISNULL(SUM(CASE WHEN v.VType IN (N'P', N'PV') AND CAST(v.VDate AS DATE) = @Today THEN v.TotalAmount ELSE 0 END), 0) AS PaymentToday,
        ISNULL(SUM(CASE WHEN v.VType IN (N'P', N'PV') AND CAST(v.VDate AS DATE) = @PrevDay THEN v.TotalAmount ELSE 0 END), 0) AS PaymentPreviousDay,
        ISNULL(SUM(CASE WHEN v.VType IN (N'P', N'PV') AND CAST(v.VDate AS DATE) >= @WeekStart AND CAST(v.VDate AS DATE) <= @Today THEN v.TotalAmount ELSE 0 END), 0) AS PaymentCurrentWeek,
        ISNULL(SUM(CASE WHEN v.VType IN (N'P', N'PV') AND CAST(v.VDate AS DATE) >= @MonthStart AND CAST(v.VDate AS DATE) <= @Today THEN v.TotalAmount ELSE 0 END), 0) AS PaymentCurrentMonth,
        ISNULL(SUM(CASE WHEN v.VType IN (N'P', N'PV') THEN v.TotalAmount ELSE 0 END), 0) AS PaymentCurrentFy
    FROM #UserOrgs uo
    LEFT JOIN dbo.ACVoucher v
        ON v.OrgID = uo.OrgID
       AND v.FyID = @FyID
    GROUP BY uo.OrgID, uo.OrganizationName
    ORDER BY uo.OrganizationName;

    -- Result set 2: Available cash (Cash in Hand / Cash in Bank)
    SELECT
        uo.OrgID,
        uo.OrganizationName,
        ISNULL(SUM(CASE
            WHEN arm.AccountRegister LIKE N'%Cash%' OR arm.AccountRegister LIKE N'%रोख%'
            THEN ISNULL(bal.BalanceAmt, 0)
            ELSE 0
        END), 0) AS CashInHand,
        ISNULL(SUM(CASE
            WHEN arm.AccountRegister LIKE N'%Cash%' OR arm.AccountRegister LIKE N'%रोख%'
            THEN 0
            ELSE ISNULL(bal.BalanceAmt, 0)
        END), 0) AS CashInBank
    FROM #UserOrgs uo
    LEFT JOIN dbo.ACAccountRegisterOrgWiseDefine ard
        ON ard.OrgID = uo.OrgID
        OR (
            NOT EXISTS (
                SELECT 1
                FROM dbo.ACAccountRegisterOrgWiseDefine own
                WHERE own.OrgID = uo.OrgID
            )
            AND ard.OrgID = (
                SELECT om2.UnderOrgID
                FROM dbo.OrgMaster om2
                WHERE om2.OrgID = uo.OrgID
            )
        )
    LEFT JOIN dbo.ACAccountRegisterMaster arm
        ON arm.AccountRegisterID = ard.AccountRegisterID
       AND arm.IsActive = 1
    OUTER APPLY (
        SELECT
            SUM(
                CASE
                    WHEN v.VType IN (N'R', N'RV') THEN ISNULL(v.TotalAmount, 0)
                    WHEN v.VType IN (N'P', N'PV') THEN -ISNULL(v.TotalAmount, 0)
                    ELSE 0
                END
            ) AS BalanceAmt
        FROM dbo.ACVoucher v
        WHERE v.OrgID = uo.OrgID
          AND v.AccountRegisterID = arm.AccountRegisterID
    ) bal
    GROUP BY uo.OrgID, uo.OrganizationName
    ORDER BY uo.OrganizationName;

    DROP TABLE #UserOrgs;
END
GO
