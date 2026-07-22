-- Teacher: save documents only (no UserMaster field validation)
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_SaveDocuments
    @UserID BIGINT,
    @DocumentsJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @UserID IS NULL OR @UserID <= 0
    BEGIN
        RAISERROR('Teacher is required.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.UserMaster um WHERE um.UserID = @UserID)
    BEGIN
        RAISERROR('Teacher not found.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    DELETE FROM dbo.UserDocument WHERE UserID = @UserID;

    IF @DocumentsJson IS NOT NULL AND ISJSON(@DocumentsJson) = 1
    BEGIN
        INSERT INTO dbo.UserDocument (UserID, DocumentID, DocumentPath)
        SELECT @UserID, j.EmpDocumentCode, j.EmpDocumentPath
        FROM OPENJSON(@DocumentsJson)
        WITH (
            EmpDocumentCode BIGINT '$.empDocumentCode',
            EmpDocumentPath VARCHAR(510) '$.empDocumentPath'
        ) j
        WHERE j.EmpDocumentCode IS NOT NULL
          AND NULLIF(LTRIM(RTRIM(j.EmpDocumentPath)), '') IS NOT NULL;
    END

    COMMIT TRANSACTION;
END
GO

PRINT '089_Teacher_SaveDocuments applied.';
GO
