-- ============================================================
-- StockRegister Save: StockID is NOT IDENTITY on SmartERP_TESTING
-- Assign next StockID on insert (same pattern as ClassMaster SrNo)
-- ============================================================
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Stock_Save
    @StockID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @ItemID BIGINT,
    @Qty DECIMAL(18, 2),
    @Rate DECIMAL(18, 2),
    @Remark NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Qty <= 0
    BEGIN
        RAISERROR('Quantity must be greater than zero.', 16, 1);
        RETURN;
    END

    IF @Rate < 0
    BEGIN
        RAISERROR('Rate must be greater than or equal to zero.', 16, 1);
        RETURN;
    END

    DECLARE @Amount DECIMAL(18, 2) = @Qty * @Rate;

    IF @StockID IS NULL OR @StockID = 0
    BEGIN
        SELECT @StockID = ISNULL(MAX(st.StockID), 0) + 1
        FROM dbo.StockRegister st WITH (UPDLOCK, HOLDLOCK);

        INSERT INTO dbo.StockRegister (StockID, OrgID, ItemID, Qty, Rate, Amount, Remark)
        VALUES (@StockID, @OrgID, @ItemID, @Qty, @Rate, @Amount, @Remark);
    END
    ELSE
    BEGIN
        UPDATE dbo.StockRegister
        SET OrgID = @OrgID,
            ItemID = @ItemID,
            Qty = @Qty,
            Rate = @Rate,
            Amount = @Amount,
            Remark = @Remark
        WHERE StockID = @StockID;
    END
END
GO

PRINT '079_Stock_Save_StockID_Fix applied.';
GO
