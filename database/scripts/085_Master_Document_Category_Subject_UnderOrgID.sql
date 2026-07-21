-- DocumentMaster, CategoryMaster, SubjectMaster — org-scoped (UnderOrgID) CRUD + import
SET NOCOUNT ON;
GO

-- ===================== Schema alignment (safe on live) =====================
IF COL_LENGTH('dbo.DocumentMaster', 'UnderOrgID') IS NULL
BEGIN
    ALTER TABLE dbo.DocumentMaster ADD UnderOrgID BIGINT NULL;
    PRINT 'Added DocumentMaster.UnderOrgID';
END
GO

IF COL_LENGTH('dbo.DocumentMaster', 'SrNo') IS NULL
BEGIN
    ALTER TABLE dbo.DocumentMaster ADD SrNo BIGINT NULL;
    PRINT 'Added DocumentMaster.SrNo';
END
GO

IF COL_LENGTH('dbo.CategoryMaster', 'UnderOrgID') IS NULL
BEGIN
    ALTER TABLE dbo.CategoryMaster ADD UnderOrgID BIGINT NULL;
    PRINT 'Added CategoryMaster.UnderOrgID';
END
GO

IF COL_LENGTH('dbo.SubjectMaster', 'UnderOrgID') IS NULL
BEGIN
    ALTER TABLE dbo.SubjectMaster ADD UnderOrgID BIGINT NULL;
    PRINT 'Added SubjectMaster.UnderOrgID';
END
GO

-- Legacy global rows belong to source org 1 for import
UPDATE dbo.DocumentMaster SET UnderOrgID = 1 WHERE UnderOrgID IS NULL;
UPDATE dbo.CategoryMaster SET UnderOrgID = 1 WHERE UnderOrgID IS NULL;
UPDATE dbo.SubjectMaster SET UnderOrgID = 1 WHERE UnderOrgID IS NULL;
GO

;WITH numbered AS (
    SELECT d.DocumentID, ROW_NUMBER() OVER (PARTITION BY ISNULL(d.UnderOrgID, 1) ORDER BY d.DocumentID) AS rn
    FROM dbo.DocumentMaster d
    WHERE d.SrNo IS NULL OR d.SrNo <= 0
)
UPDATE d
SET d.SrNo = n.rn
FROM dbo.DocumentMaster d
INNER JOIN numbered n ON n.DocumentID = d.DocumentID;
GO

-- ===================== DocumentMaster =====================
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
        d.IsActive,
        om.OrganizationName
    FROM dbo.DocumentMaster d
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = d.UnderOrgID
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
        d.IsActive,
        om.OrganizationName
    FROM dbo.DocumentMaster d
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = d.UnderOrgID
    WHERE d.DocumentID = @DocumentID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Document_GetNextSrNo
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(d.SrNo), 0) + 1 AS NextSrNo
    FROM dbo.DocumentMaster d
    WHERE ISNULL(d.UnderOrgID, 1) = @OrgID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Document_Save
    @DocumentID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @SrNo BIGINT = NULL,
    @DocumentName NVARCHAR(200),
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
        INSERT INTO dbo.DocumentMaster (UnderOrgID, SrNo, DocumentName, IsActive)
        VALUES (@UnderOrgID, @SrNo, @DocumentName, @IsActive);
        SET @DocumentID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.DocumentMaster
        SET UnderOrgID = @UnderOrgID, SrNo = @SrNo, DocumentName = @DocumentName, IsActive = @IsActive
        WHERE DocumentID = @DocumentID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Document_Delete
    @DocumentID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.DocumentMaster SET IsActive = 0 WHERE DocumentID = @DocumentID;
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
    DECLARE @Name NVARCHAR(200), @IsActive BIT, @NextSrNo BIGINT;

    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT LTRIM(RTRIM(d.DocumentName)), ISNULL(d.IsActive, 1)
    FROM OPENJSON(@DocumentIdsJson) j
    INNER JOIN dbo.DocumentMaster d ON d.DocumentID = TRY_CAST(j.value AS BIGINT)
    WHERE ISNULL(d.UnderOrgID, 1) = 1 AND ISNULL(d.IsActive, 1) = 1 AND TRY_CAST(j.value AS BIGINT) IS NOT NULL
    ORDER BY d.SrNo, d.DocumentID;

    OPEN src;
    FETCH NEXT FROM src INTO @Name, @IsActive;
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
            INSERT INTO dbo.DocumentMaster (UnderOrgID, SrNo, DocumentName, IsActive)
            VALUES (@DestinationOrgID, @NextSrNo, @Name, @IsActive);
            SET @ImportedCount = @ImportedCount + 1;
        END
        FETCH NEXT FROM src INTO @Name, @IsActive;
    END
    CLOSE src; DEALLOCATE src;
    COMMIT TRANSACTION;
    SELECT @ImportedCount AS ImportedCount, @SkippedCount AS SkippedCount;
END
GO

-- ===================== CategoryMaster =====================
CREATE OR ALTER PROCEDURE dbo.sp_Category_GetList
    @OrgID BIGINT,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.CategoryID, c.UnderOrgID, c.CategoryName, c.IsActive, om.OrganizationName
    FROM dbo.CategoryMaster c
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = c.UnderOrgID
    WHERE ISNULL(c.UnderOrgID, 1) = @OrgID
      AND (@Search IS NULL OR @Search = N'' OR c.CategoryName LIKE N'%' + @Search + N'%')
    ORDER BY c.CategoryName, c.CategoryID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_GetById
    @CategoryID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.CategoryID, c.UnderOrgID, c.CategoryName, c.IsActive, om.OrganizationName
    FROM dbo.CategoryMaster c
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = c.UnderOrgID
    WHERE c.CategoryID = @CategoryID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_Save
    @CategoryID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @CategoryName NVARCHAR(200),
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @CategoryName = LTRIM(RTRIM(ISNULL(@CategoryName, N'')));
    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0 BEGIN RAISERROR('Organization is required.', 16, 1); RETURN; END
    IF @CategoryName = N'' BEGIN RAISERROR('Category name is required.', 16, 1); RETURN; END
    IF EXISTS (
        SELECT 1 FROM dbo.CategoryMaster c
        WHERE ISNULL(c.UnderOrgID, 1) = @UnderOrgID AND c.CategoryName = @CategoryName
          AND c.CategoryID <> ISNULL(@CategoryID, 0)
    ) BEGIN RAISERROR('Category name already exists for this organization.', 16, 1); RETURN; END

    IF @CategoryID IS NULL OR @CategoryID = 0
    BEGIN
        INSERT INTO dbo.CategoryMaster (UnderOrgID, CategoryName, IsActive) VALUES (@UnderOrgID, @CategoryName, @IsActive);
        SET @CategoryID = SCOPE_IDENTITY();
    END
    ELSE
        UPDATE dbo.CategoryMaster SET UnderOrgID = @UnderOrgID, CategoryName = @CategoryName, IsActive = @IsActive
        WHERE CategoryID = @CategoryID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_Delete
    @CategoryID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.CategoryMaster SET IsActive = 0 WHERE CategoryID = @CategoryID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_Import
    @DestinationOrgID BIGINT,
    @CategoryIdsJson NVARCHAR(MAX),
    @ImportedCount INT = 0 OUTPUT,
    @SkippedCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @ImportedCount = 0; SET @SkippedCount = 0;
    IF @DestinationOrgID IS NULL OR @DestinationOrgID <= 0 BEGIN RAISERROR('Organization is required.', 16, 1); RETURN; END
    IF @DestinationOrgID = 1 BEGIN RAISERROR('Cannot import into the source organization.', 16, 1); RETURN; END
    IF @CategoryIdsJson IS NULL OR LTRIM(RTRIM(@CategoryIdsJson)) IN (N'', N'[]')
    BEGIN RAISERROR('Select at least one category to import.', 16, 1); RETURN; END

    BEGIN TRANSACTION;
    DECLARE @Name NVARCHAR(200), @IsActive BIT;
    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT LTRIM(RTRIM(c.CategoryName)), ISNULL(c.IsActive, 1)
    FROM OPENJSON(@CategoryIdsJson) j
    INNER JOIN dbo.CategoryMaster c ON c.CategoryID = TRY_CAST(j.value AS BIGINT)
    WHERE ISNULL(c.UnderOrgID, 1) = 1 AND ISNULL(c.IsActive, 1) = 1 AND TRY_CAST(j.value AS BIGINT) IS NOT NULL
    ORDER BY c.CategoryName, c.CategoryID;
    OPEN src;
    FETCH NEXT FROM src INTO @Name, @IsActive;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @Name IS NULL OR @Name = N'' OR EXISTS (
            SELECT 1 FROM dbo.CategoryMaster dest WHERE dest.UnderOrgID = @DestinationOrgID AND dest.CategoryName = @Name
        ) SET @SkippedCount = @SkippedCount + 1;
        ELSE BEGIN
            INSERT INTO dbo.CategoryMaster (UnderOrgID, CategoryName, IsActive) VALUES (@DestinationOrgID, @Name, @IsActive);
            SET @ImportedCount = @ImportedCount + 1;
        END
        FETCH NEXT FROM src INTO @Name, @IsActive;
    END
    CLOSE src; DEALLOCATE src;
    COMMIT TRANSACTION;
    SELECT @ImportedCount AS ImportedCount, @SkippedCount AS SkippedCount;
END
GO

-- ===================== SubjectMaster (org-scoped) =====================
CREATE OR ALTER PROCEDURE dbo.sp_Subject_GetList
    @OrgID BIGINT,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.SubjectID, s.UnderOrgID, s.SubjectName, s.IsActive, om.OrganizationName
    FROM dbo.SubjectMaster s
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = s.UnderOrgID
    WHERE ISNULL(s.UnderOrgID, 1) = @OrgID
      AND (@Search IS NULL OR @Search = N'' OR s.SubjectName LIKE N'%' + @Search + N'%')
    ORDER BY s.SubjectName, s.SubjectID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_GetById
    @SubjectID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.SubjectID, s.UnderOrgID, s.SubjectName, s.IsActive, om.OrganizationName
    FROM dbo.SubjectMaster s
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = s.UnderOrgID
    WHERE s.SubjectID = @SubjectID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_GetOptions
    @OrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.SubjectID, s.SubjectName
    FROM dbo.SubjectMaster s
    WHERE ISNULL(s.IsActive, 1) = 1
      AND (@OrgID IS NULL OR ISNULL(s.UnderOrgID, 1) = @OrgID)
    ORDER BY s.SubjectName, s.SubjectID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_Save
    @SubjectID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @SubjectName NVARCHAR(200),
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @SubjectName = LTRIM(RTRIM(ISNULL(@SubjectName, N'')));
    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0 BEGIN RAISERROR('Organization is required.', 16, 1); RETURN; END
    IF @SubjectName = N'' BEGIN RAISERROR('Subject name is required.', 16, 1); RETURN; END
    IF EXISTS (
        SELECT 1 FROM dbo.SubjectMaster s
        WHERE ISNULL(s.UnderOrgID, 1) = @UnderOrgID AND s.SubjectName = @SubjectName
          AND s.SubjectID <> ISNULL(@SubjectID, 0)
    ) BEGIN RAISERROR('Subject name already exists for this organization.', 16, 1); RETURN; END

    IF @SubjectID IS NULL OR @SubjectID = 0
    BEGIN
        INSERT INTO dbo.SubjectMaster (UnderOrgID, SubjectName, IsActive) VALUES (@UnderOrgID, @SubjectName, @IsActive);
        SET @SubjectID = SCOPE_IDENTITY();
    END
    ELSE
        UPDATE dbo.SubjectMaster SET UnderOrgID = @UnderOrgID, SubjectName = @SubjectName, IsActive = @IsActive
        WHERE SubjectID = @SubjectID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_Delete
    @SubjectID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.SubjectMaster SET IsActive = 0 WHERE SubjectID = @SubjectID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_Import
    @DestinationOrgID BIGINT,
    @SubjectIdsJson NVARCHAR(MAX),
    @ImportedCount INT = 0 OUTPUT,
    @SkippedCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @ImportedCount = 0; SET @SkippedCount = 0;
    IF @DestinationOrgID IS NULL OR @DestinationOrgID <= 0 BEGIN RAISERROR('Organization is required.', 16, 1); RETURN; END
    IF @DestinationOrgID = 1 BEGIN RAISERROR('Cannot import into the source organization.', 16, 1); RETURN; END
    IF @SubjectIdsJson IS NULL OR LTRIM(RTRIM(@SubjectIdsJson)) IN (N'', N'[]')
    BEGIN RAISERROR('Select at least one subject to import.', 16, 1); RETURN; END

    BEGIN TRANSACTION;
    DECLARE @Name NVARCHAR(200), @IsActive BIT;
    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT LTRIM(RTRIM(s.SubjectName)), ISNULL(s.IsActive, 1)
    FROM OPENJSON(@SubjectIdsJson) j
    INNER JOIN dbo.SubjectMaster s ON s.SubjectID = TRY_CAST(j.value AS BIGINT)
    WHERE ISNULL(s.UnderOrgID, 1) = 1 AND ISNULL(s.IsActive, 1) = 1 AND TRY_CAST(j.value AS BIGINT) IS NOT NULL
    ORDER BY s.SubjectName, s.SubjectID;
    OPEN src;
    FETCH NEXT FROM src INTO @Name, @IsActive;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @Name IS NULL OR @Name = N'' OR EXISTS (
            SELECT 1 FROM dbo.SubjectMaster dest WHERE dest.UnderOrgID = @DestinationOrgID AND dest.SubjectName = @Name
        ) SET @SkippedCount = @SkippedCount + 1;
        ELSE BEGIN
            INSERT INTO dbo.SubjectMaster (UnderOrgID, SubjectName, IsActive) VALUES (@DestinationOrgID, @Name, @IsActive);
            SET @ImportedCount = @ImportedCount + 1;
        END
        FETCH NEXT FROM src INTO @Name, @IsActive;
    END
    CLOSE src; DEALLOCATE src;
    COMMIT TRANSACTION;
    SELECT @ImportedCount AS ImportedCount, @SkippedCount AS SkippedCount;
END
GO

PRINT '085_Master_Document_Category_Subject_UnderOrgID applied.';
GO
