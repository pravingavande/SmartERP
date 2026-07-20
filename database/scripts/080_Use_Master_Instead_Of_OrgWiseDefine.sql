-- Drop OrgWiseDefine usage: use ACAccountRegisterMaster / DRHeadMaster (UnderOrgID) instead.
-- Also re-marks deleted OrgWise tables with DEL prefix if they were restored.

USE SmartERP_TESTING;
GO

/* ---- Re-delete OrgWise tables (keep data under DEL name) ---- */
IF OBJECT_ID(N'dbo.ACAccountRegisterOrgWiseDefine', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.[DEL ACAccountRegisterOrgWiseDefine]', N'U') IS NULL
BEGIN
    EXEC sp_rename N'dbo.ACAccountRegisterOrgWiseDefine', N'DEL ACAccountRegisterOrgWiseDefine';
END
GO

IF OBJECT_ID(N'dbo.DRHeadOrgWiseDefine', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.[DEL DRHeadOrgWiseDefine]', N'U') IS NULL
BEGIN
    EXEC sp_rename N'dbo.DRHeadOrgWiseDefine', N'DEL DRHeadOrgWiseDefine';
END
GO

/* ---- Account registers for an org (walk up to parent until masters found) ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetAccountRegisters
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
        RETURN;

    DECLARE @LookupOrgID BIGINT = @OrgID;

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

    SELECT
        arm.AccountRegisterID,
        arm.AccountRegister,
        @OrgID AS OrgID
    FROM dbo.ACAccountRegisterMaster arm
    WHERE arm.UnderOrgID = @LookupOrgID
      AND ISNULL(arm.IsActive, 1) = 1
    ORDER BY arm.AccountRegister;
END
GO

/* ---- Define screens now reflect Master rows for that UnderOrgID ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Audit_AccountRegisterDefine_GetByOrg
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        arm.AccountRegisterID,
        arm.AccountRegister
    FROM dbo.ACAccountRegisterMaster arm
    WHERE arm.UnderOrgID = @OrgID
      AND ISNULL(arm.IsActive, 1) = 1
    ORDER BY arm.AccountRegister;
END
GO

-- OrgWise mapping removed; manage registers via Account Register Master / Import.
CREATE OR ALTER PROCEDURE dbo.sp_Audit_AccountRegisterDefine_Save
    @OrgID BIGINT,
    @AccountRegisterIdsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    -- No-op: ACAccountRegisterOrgWiseDefine retired. Use ACAccountRegisterMaster.UnderOrgID.
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetDRHeads
    @OrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrgID IS NULL
    BEGIN
        SELECT
            dh.DRHeadID,
            dh.DRHeadName
        FROM dbo.DRHeadMaster dh
        WHERE ISNULL(dh.IsActive, 1) = 1
        ORDER BY dh.DRHeadName;
        RETURN;
    END

    DECLARE @LookupOrgID BIGINT = @OrgID;

    WHILE @LookupOrgID IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM dbo.DRHeadMaster dh
            WHERE dh.UnderOrgID = @LookupOrgID
              AND ISNULL(dh.IsActive, 1) = 1
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

    SELECT
        dh.DRHeadID,
        dh.DRHeadName
    FROM dbo.DRHeadMaster dh
    WHERE dh.UnderOrgID = @LookupOrgID
      AND ISNULL(dh.IsActive, 1) = 1
    ORDER BY dh.DRHeadName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_DRHeadDefine_GetByOrg
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dh.DRHeadID,
        dh.DRHeadName
    FROM dbo.DRHeadMaster dh
    WHERE dh.UnderOrgID = @OrgID
      AND ISNULL(dh.IsActive, 1) = 1
    ORDER BY dh.DRHeadName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_DRHeadDefine_Save
    @OrgID BIGINT,
    @DRHeadIdsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    -- No-op: DRHeadOrgWiseDefine retired. Use DRHeadMaster.UnderOrgID.
END
GO

/* ---- Dashboard: registers from Master (org, else parent) ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetDashboard
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @SansthaOrgID BIGINT;
    DECLARE @IsSansthaUser BIT = 0;

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

    SELECT
        om.OrgID,
        om.OrganizationName,
        arm.AccountRegisterID,
        arm.AccountRegister,
        lastV.LastTransactionDate,
        ISNULL(bal.BankBalance, 0) AS BankBalance,
        CASE
            WHEN arm.AccountRegister LIKE N'%Cash%' OR arm.AccountRegister LIKE N'%रोख%' THEN
                CASE
                    WHEN vtype.SampleVType IN (N'R', N'RV') THEN N'Receipt Voucher - Cash'
                    WHEN vtype.SampleVType = N'BD' THEN N'Bank Deposit - Cash'
                    WHEN vtype.SampleVType = N'BW' THEN N'Bank Withdraw - Cash'
                    ELSE N'Payment Voucher - Cash'
                END
            ELSE
                CASE
                    WHEN vtype.SampleVType IN (N'R', N'RV') THEN N'Receipt Voucher - Bank'
                    WHEN vtype.SampleVType = N'BD' THEN N'Bank Deposit'
                    WHEN vtype.SampleVType = N'BW' THEN N'Bank Withdraw'
                    ELSE N'Payment Voucher - Bank'
                END
        END AS VoucherCategory
    FROM dbo.OrgMaster om
    INNER JOIN dbo.ACAccountRegisterMaster arm
        ON ISNULL(arm.IsActive, 1) = 1
       AND (
            arm.UnderOrgID = om.OrgID
            OR (
                NOT EXISTS (
                    SELECT 1
                    FROM dbo.ACAccountRegisterMaster own
                    WHERE own.UnderOrgID = om.OrgID
                      AND ISNULL(own.IsActive, 1) = 1
                )
                AND arm.UnderOrgID = om.UnderOrgID
            )
       )
    OUTER APPLY (
        SELECT MAX(v.VDate) AS LastTransactionDate
        FROM dbo.ACVoucher v
        WHERE v.OrgID = om.OrgID
          AND v.AccountRegisterID = arm.AccountRegisterID
    ) lastV
    OUTER APPLY (
        SELECT
            SUM(
                CASE
                    WHEN v.VType IN (N'R', N'RV', N'BD') THEN ISNULL(v.TotalAmount, 0)
                    WHEN v.VType IN (N'P', N'PV', N'BW') THEN -ISNULL(v.TotalAmount, 0)
                    ELSE 0
                END
            ) AS BankBalance
        FROM dbo.ACVoucher v
        WHERE v.OrgID = om.OrgID
          AND v.AccountRegisterID = arm.AccountRegisterID
    ) bal
    OUTER APPLY (
        SELECT TOP 1 v.VType AS SampleVType
        FROM dbo.ACVoucher v
        WHERE v.OrgID = om.OrgID
          AND v.AccountRegisterID = arm.AccountRegisterID
        ORDER BY v.VDate DESC, v.VoucherID DESC
    ) vtype
    WHERE ISNULL(om.IsActive, 1) = 1
      AND (
          (@IsSansthaUser = 1 AND (om.OrgID = @SansthaOrgID OR om.UnderOrgID = @SansthaOrgID))
          OR (@IsSansthaUser = 0 AND om.OrgID = @UserOrgID)
      )
    ORDER BY om.OrganizationName, arm.AccountRegister;
END
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

    SET @Dow = DATEPART(WEEKDAY, @Today);
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
    LEFT JOIN dbo.ACAccountRegisterMaster arm
        ON ISNULL(arm.IsActive, 1) = 1
       AND (
            arm.UnderOrgID = uo.OrgID
            OR (
                NOT EXISTS (
                    SELECT 1
                    FROM dbo.ACAccountRegisterMaster own
                    WHERE own.UnderOrgID = uo.OrgID
                      AND ISNULL(own.IsActive, 1) = 1
                )
                AND arm.UnderOrgID = (
                    SELECT om2.UnderOrgID
                    FROM dbo.OrgMaster om2
                    WHERE om2.OrgID = uo.OrgID
                )
            )
       )
    OUTER APPLY (
        SELECT
            SUM(
                CASE
                    WHEN v.VType IN (N'R', N'RV', N'BD') THEN ISNULL(v.TotalAmount, 0)
                    WHEN v.VType IN (N'P', N'PV', N'BW') THEN -ISNULL(v.TotalAmount, 0)
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
