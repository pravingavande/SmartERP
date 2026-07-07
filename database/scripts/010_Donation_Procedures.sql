-- Donation (DREntry) module stored procedures
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetDRHeads
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dh.DRHeadID,
        dh.DRHeadName
    FROM dbo.DRHeadMaster dh
    WHERE dh.IsActive = 1
    ORDER BY dh.DRHeadName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetNextReceiptNo
    @FyID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NextNo BIGINT;

    SELECT @NextNo = ISNULL(MAX(dr.ReceiptNo), 0) + 1
    FROM dbo.DREntry dr
    WHERE dr.FyID = @FyID;

    SELECT ISNULL(@NextNo, 1) AS NextReceiptNo;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetNextOrgReceiptNo
    @OrgID BIGINT,
    @FyID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NextNo BIGINT;

    SELECT @NextNo = ISNULL(MAX(dr.OrgIDReceiptNo), 0) + 1
    FROM dbo.DREntry dr
    WHERE dr.OrgID = @OrgID
      AND dr.FyID = @FyID;

    SELECT ISNULL(@NextNo, 1) AS NextOrgReceiptNo;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetList
    @OrgID BIGINT = NULL,
    @FyID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dr.DRID,
        dr.ReceiptNo,
        dr.ReceiptDate,
        dr.DRHeadID,
        dr.DonorName,
        dr.Address,
        dr.PanNo,
        dr.AadharNo,
        dr.MobileNo,
        dr.Amount,
        dr.PaymentTypeID,
        dr.TransactionNo,
        dr.TransactionDate,
        dr.DepositDate,
        dr.Remark,
        dr.UserID,
        dr.FyID,
        dr.OrgID,
        dr.OrgIDReceiptNo,
        dh.DRHeadName,
        om.OrganizationName,
        pt.PaymentType,
        fy.FyName
    FROM dbo.DREntry dr
    LEFT JOIN dbo.DRHeadMaster dh ON dh.DRHeadID = dr.DRHeadID
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = dr.OrgID
    LEFT JOIN dbo.PaymentTypeMaster pt ON pt.PaymentTypeID = dr.PaymentTypeID
    LEFT JOIN dbo.FyMaster fy ON fy.FyID = dr.FyID
    WHERE (@OrgID IS NULL OR dr.OrgID = @OrgID)
      AND (@FyID IS NULL OR dr.FyID = @FyID)
    ORDER BY dr.ReceiptDate DESC, dr.DRID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetById
    @DRID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dr.DRID,
        dr.ReceiptNo,
        dr.ReceiptDate,
        dr.DRHeadID,
        dr.DonorName,
        dr.Address,
        dr.PanNo,
        dr.AadharNo,
        dr.MobileNo,
        dr.Amount,
        dr.PaymentTypeID,
        dr.TransactionNo,
        dr.TransactionDate,
        dr.DepositDate,
        dr.Remark,
        dr.UserID,
        dr.FyID,
        dr.OrgID,
        dr.OrgIDReceiptNo,
        dh.DRHeadName,
        om.OrganizationName,
        pt.PaymentType,
        fy.FyName
    FROM dbo.DREntry dr
    LEFT JOIN dbo.DRHeadMaster dh ON dh.DRHeadID = dr.DRHeadID
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = dr.OrgID
    LEFT JOIN dbo.PaymentTypeMaster pt ON pt.PaymentTypeID = dr.PaymentTypeID
    LEFT JOIN dbo.FyMaster fy ON fy.FyID = dr.FyID
    WHERE dr.DRID = @DRID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_Save
    @DRID BIGINT = NULL OUTPUT,
    @ReceiptNo BIGINT = NULL,
    @ReceiptDate DATETIME,
    @DRHeadID BIGINT,
    @DonorName NVARCHAR(200),
    @Address NVARCHAR(500) = NULL,
    @PanNo NVARCHAR(20) = NULL,
    @AadharNo NVARCHAR(20) = NULL,
    @MobileNo NVARCHAR(20) = NULL,
    @Amount NUMERIC(18, 2),
    @PaymentTypeID BIGINT = NULL,
    @TransactionNo NVARCHAR(100) = NULL,
    @TransactionDate DATE = NULL,
    @DepositDate DATETIME = NULL,
    @Remark NVARCHAR(MAX) = NULL,
    @UserID BIGINT,
    @FyID BIGINT,
    @OrgID BIGINT,
    @OrgIDReceiptNo BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    IF @DRID IS NULL OR @DRID = 0
    BEGIN
        IF @ReceiptNo IS NULL OR @ReceiptNo = 0
        BEGIN
            SELECT @ReceiptNo = ISNULL(MAX(dr.ReceiptNo), 0) + 1
            FROM dbo.DREntry dr WITH (UPDLOCK, HOLDLOCK)
            WHERE dr.FyID = @FyID;
        END

        IF @OrgIDReceiptNo IS NULL OR @OrgIDReceiptNo = 0
        BEGIN
            SELECT @OrgIDReceiptNo = ISNULL(MAX(dr.OrgIDReceiptNo), 0) + 1
            FROM dbo.DREntry dr WITH (UPDLOCK, HOLDLOCK)
            WHERE dr.OrgID = @OrgID
              AND dr.FyID = @FyID;
        END

        INSERT INTO dbo.DREntry (
            ReceiptNo,
            ReceiptDate,
            DRHeadID,
            DonorName,
            Address,
            PanNo,
            AadharNo,
            MobileNo,
            Amount,
            PaymentTypeID,
            TransactionNo,
            TransactionDate,
            DepositDate,
            Remark,
            UserID,
            FyID,
            OrgID,
            OrgIDReceiptNo
        )
        VALUES (
            @ReceiptNo,
            @ReceiptDate,
            @DRHeadID,
            @DonorName,
            @Address,
            @PanNo,
            @AadharNo,
            @MobileNo,
            @Amount,
            @PaymentTypeID,
            @TransactionNo,
            @TransactionDate,
            @DepositDate,
            @Remark,
            @UserID,
            @FyID,
            @OrgID,
            @OrgIDReceiptNo
        );

        SET @DRID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.DREntry
        SET
            ReceiptDate = @ReceiptDate,
            DRHeadID = @DRHeadID,
            DonorName = @DonorName,
            Address = @Address,
            PanNo = @PanNo,
            AadharNo = @AadharNo,
            MobileNo = @MobileNo,
            Amount = @Amount,
            PaymentTypeID = @PaymentTypeID,
            TransactionNo = @TransactionNo,
            TransactionDate = @TransactionDate,
            DepositDate = @DepositDate,
            Remark = @Remark,
            FyID = @FyID,
            OrgID = @OrgID
        WHERE DRID = @DRID;
    END

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_Delete
    @DRID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.DREntry
    WHERE DRID = @DRID;
END
GO

PRINT N'Donation procedures created.';
GO
