-- Widen AttachmentPath on Inward/Outward (live had NVARCHAR(50); app paths are ~54+ chars)
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.InwardRegister', N'AttachmentPath') IS NOT NULL
    ALTER TABLE dbo.InwardRegister ALTER COLUMN AttachmentPath NVARCHAR(500) NULL;
GO

IF COL_LENGTH(N'dbo.OutwardRegister', N'AttachmentPath') IS NOT NULL
    ALTER TABLE dbo.OutwardRegister ALTER COLUMN AttachmentPath NVARCHAR(500) NULL;
GO

PRINT '124_IO_AttachmentPath_Widen applied.';
GO
