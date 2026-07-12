-- AdminRemak was nchar(10) — too small for multiline admin remarks (caused 500 on save)
USE SmartERP;
GO

IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'UserLeaveApply'
      AND COLUMN_NAME = 'AdminRemak'
      AND (DATA_TYPE <> 'nvarchar' OR CHARACTER_MAXIMUM_LENGTH NOT IN (-1, 500, 1000))
)
BEGIN
    ALTER TABLE dbo.UserLeaveApply
    ALTER COLUMN AdminRemak NVARCHAR(MAX) NULL;
END
GO
