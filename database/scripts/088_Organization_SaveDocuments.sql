-- Organization: save documents only (no OrgMaster field validation)
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organization_SaveDocuments
    @OrgID BIGINT,
    @DocumentsJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.OrgMaster om WHERE om.OrgID = @OrgID)
    BEGIN
        RAISERROR('Organization not found.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    DELETE FROM dbo.OrgDocument WHERE OrgID = @OrgID;

    IF @DocumentsJson IS NOT NULL AND ISJSON(@DocumentsJson) = 1
    BEGIN
        INSERT INTO dbo.OrgDocument (OrgID, DocumentID, DocumentPath)
        SELECT @OrgID, j.DocumentID, j.DocumentPath
        FROM OPENJSON(@DocumentsJson)
        WITH (
            DocumentID BIGINT '$.documentID',
            DocumentPath VARCHAR(510) '$.documentPath'
        ) j
        WHERE j.DocumentID IS NOT NULL
          AND NULLIF(LTRIM(RTRIM(j.DocumentPath)), '') IS NOT NULL;
    END

    COMMIT TRANSACTION;
END
GO

PRINT '088_Organization_SaveDocuments applied.';
GO
