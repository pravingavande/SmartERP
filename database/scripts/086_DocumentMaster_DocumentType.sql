-- DocumentMaster: DocumentTypeID mapping + DocumentTypeMaster lookups
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.DocumentMaster', 'DocumentTypeID') IS NULL
BEGIN
    ALTER TABLE dbo.DocumentMaster ADD DocumentTypeID INT NULL;
    PRINT 'Added DocumentMaster.DocumentTypeID';
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DocumentType_GetOptions
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dt.DocumentTypeID,
        dt.DocumentTypeName
    FROM dbo.DocumentTypeMaster dt
    WHERE ISNULL(dt.IsActive, 1) = 1
    ORDER BY dt.DocumentTypeName, dt.DocumentTypeID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Document_GetList
    @OrgID BIGINT,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        d.DocumentID,
        d.UnderOrgID,
        d.SrNo,
        d.DocumentName,
        d.DocumentTypeID,
        dt.DocumentTypeName,
        d.IsActive,
        om.OrganizationName
    FROM dbo.DocumentMaster d
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = d.UnderOrgID
    LEFT JOIN dbo.DocumentTypeMaster dt ON dt.DocumentTypeID = d.DocumentTypeID
    WHERE ISNULL(d.UnderOrgID, 1) = @OrgID
      AND (
          @Search IS NULL
          OR @Search = N''
          OR d.DocumentName LIKE N'%' + @Search + N'%'
      )
    ORDER BY d.SrNo, d.DocumentName, d.DocumentID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Document_GetById
    @DocumentID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        d.DocumentID,
        d.UnderOrgID,
        d.SrNo,
        d.DocumentName,
        d.DocumentTypeID,
        dt.DocumentTypeName,
        d.IsActive,
        om.OrganizationName
    FROM dbo.DocumentMaster d
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = d.UnderOrgID
    LEFT JOIN dbo.DocumentTypeMaster dt ON dt.DocumentTypeID = d.DocumentTypeID
    WHERE d.DocumentID = @DocumentID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Document_Save
    @DocumentID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @SrNo BIGINT = NULL,
    @DocumentName NVARCHAR(200),
    @DocumentTypeID INT = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @DocumentName = LTRIM(RTRIM(ISNULL(@DocumentName, N'')));

    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @DocumentName = N''
    BEGIN
        RAISERROR('Document name is required.', 16, 1);
        RETURN;
    END

    IF @DocumentTypeID IS NULL OR @DocumentTypeID <= 0
    BEGIN
        RAISERROR('Document type is required.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.DocumentTypeMaster dt WHERE dt.DocumentTypeID = @DocumentTypeID)
    BEGIN
        RAISERROR('Document type is required.', 16, 1);
        RETURN;
    END

    IF @SrNo IS NULL OR @SrNo <= 0
    BEGIN
        SELECT @SrNo = ISNULL(MAX(d.SrNo), 0) + 1
        FROM dbo.DocumentMaster d WITH (UPDLOCK, HOLDLOCK)
        WHERE ISNULL(d.UnderOrgID, 1) = @UnderOrgID;
    END

    IF EXISTS (
        SELECT 1 FROM dbo.DocumentMaster d
        WHERE ISNULL(d.UnderOrgID, 1) = @UnderOrgID AND d.SrNo = @SrNo
          AND d.DocumentID <> ISNULL(@DocumentID, 0)
    )
    BEGIN
        RAISERROR('Sr No already exists for this organization.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1 FROM dbo.DocumentMaster d
        WHERE ISNULL(d.UnderOrgID, 1) = @UnderOrgID AND d.DocumentName = @DocumentName
          AND d.DocumentID <> ISNULL(@DocumentID, 0)
    )
    BEGIN
        RAISERROR('Document name already exists for this organization.', 16, 1);
        RETURN;
    END

    IF @DocumentID IS NULL OR @DocumentID = 0
    BEGIN
        INSERT INTO dbo.DocumentMaster (UnderOrgID, SrNo, DocumentName, DocumentTypeID, IsActive)
        VALUES (@UnderOrgID, @SrNo, @DocumentName, @DocumentTypeID, @IsActive);
        SET @DocumentID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.DocumentMaster
        SET UnderOrgID = @UnderOrgID,
            SrNo = @SrNo,
            DocumentName = @DocumentName,
            DocumentTypeID = @DocumentTypeID,
            IsActive = @IsActive
        WHERE DocumentID = @DocumentID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Document_Import
    @DestinationOrgID BIGINT,
    @DocumentIdsJson NVARCHAR(MAX),
    @ImportedCount INT = 0 OUTPUT,
    @SkippedCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @ImportedCount = 0;
    SET @SkippedCount = 0;

    IF @DestinationOrgID IS NULL OR @DestinationOrgID <= 0
    BEGIN RAISERROR('Organization is required.', 16, 1); RETURN; END
    IF @DestinationOrgID = 1
    BEGIN RAISERROR('Cannot import into the source organization.', 16, 1); RETURN; END
    IF @DocumentIdsJson IS NULL OR LTRIM(RTRIM(@DocumentIdsJson)) IN (N'', N'[]')
    BEGIN RAISERROR('Select at least one document to import.', 16, 1); RETURN; END

    BEGIN TRANSACTION;
    DECLARE @Name NVARCHAR(200), @IsActive BIT, @NextSrNo BIGINT, @DocumentTypeID INT;

    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT LTRIM(RTRIM(d.DocumentName)), ISNULL(d.IsActive, 1), d.DocumentTypeID
    FROM OPENJSON(@DocumentIdsJson) j
    INNER JOIN dbo.DocumentMaster d ON d.DocumentID = TRY_CAST(j.value AS BIGINT)
    WHERE ISNULL(d.UnderOrgID, 1) = 1 AND ISNULL(d.IsActive, 1) = 1 AND TRY_CAST(j.value AS BIGINT) IS NOT NULL
    ORDER BY d.SrNo, d.DocumentID;

    OPEN src;
    FETCH NEXT FROM src INTO @Name, @IsActive, @DocumentTypeID;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @Name IS NULL OR @Name = N'' OR EXISTS (
            SELECT 1 FROM dbo.DocumentMaster dest
            WHERE dest.UnderOrgID = @DestinationOrgID AND dest.DocumentName = @Name
        )
            SET @SkippedCount = @SkippedCount + 1;
        ELSE
        BEGIN
            SELECT @NextSrNo = ISNULL(MAX(d.SrNo), 0) + 1
            FROM dbo.DocumentMaster d WITH (UPDLOCK, HOLDLOCK) WHERE d.UnderOrgID = @DestinationOrgID;
            INSERT INTO dbo.DocumentMaster (UnderOrgID, SrNo, DocumentName, DocumentTypeID, IsActive)
            VALUES (@DestinationOrgID, @NextSrNo, @Name, @DocumentTypeID, @IsActive);
            SET @ImportedCount = @ImportedCount + 1;
        END
        FETCH NEXT FROM src INTO @Name, @IsActive, @DocumentTypeID;
    END
    CLOSE src; DEALLOCATE src;
    COMMIT TRANSACTION;
    SELECT @ImportedCount AS ImportedCount, @SkippedCount AS SkippedCount;
END
GO

PRINT '086_DocumentMaster_DocumentType applied.';
GO
