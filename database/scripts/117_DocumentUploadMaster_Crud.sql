-- DocumentUploadMaster: org-scoped document upload CRUD with soft delete
SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.DocumentUploadMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.DocumentUploadMaster (
        DocumentUploadID BIGINT IDENTITY(1, 1) NOT NULL PRIMARY KEY,
        OrgID BIGINT NOT NULL,
        UnderOrgID BIGINT NULL,
        SrNo BIGINT NULL,
        TDate DATE NULL,
        DocumentTitle NVARCHAR(500) NOT NULL,
        DocumentPath NVARCHAR(500) NULL,
        CreatedDate DATETIME2(0) NOT NULL CONSTRAINT DF_DocumentUploadMaster_CreatedDate DEFAULT (SYSUTCDATETIME()),
        ModifiedDate DATETIME2(0) NULL,
        CreatedUserID BIGINT NULL,
        ModifiedUserID BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_DocumentUploadMaster_IsDeleted DEFAULT (0)
    );
    PRINT 'Created DocumentUploadMaster table.';
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DocumentUpload_GetList
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        d.DocumentUploadID,
        d.OrgID,
        d.UnderOrgID,
        d.SrNo,
        d.TDate,
        d.DocumentTitle,
        d.DocumentPath,
        d.CreatedDate,
        d.ModifiedDate,
        d.CreatedUserID,
        d.ModifiedUserID,
        om.OrganizationName
    FROM dbo.DocumentUploadMaster d
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = d.OrgID
    WHERE ISNULL(d.IsDeleted, 0) = 0
      AND d.OrgID = @OrgID
    ORDER BY d.SrNo, d.TDate DESC, d.DocumentUploadID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DocumentUpload_GetById
    @DocumentUploadID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        d.DocumentUploadID,
        d.OrgID,
        d.UnderOrgID,
        d.SrNo,
        d.TDate,
        d.DocumentTitle,
        d.DocumentPath,
        d.CreatedDate,
        d.ModifiedDate,
        d.CreatedUserID,
        d.ModifiedUserID,
        om.OrganizationName
    FROM dbo.DocumentUploadMaster d
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = d.OrgID
    WHERE d.DocumentUploadID = @DocumentUploadID
      AND ISNULL(d.IsDeleted, 0) = 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DocumentUpload_GetNextSrNo
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(d.SrNo), 0) + 1 AS NextSrNo
    FROM dbo.DocumentUploadMaster d
    WHERE d.OrgID = @OrgID
      AND ISNULL(d.IsDeleted, 0) = 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DocumentUpload_Save
    @DocumentUploadID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @UnderOrgID BIGINT = NULL,
    @SrNo BIGINT = NULL,
    @TDate DATE,
    @DocumentTitle NVARCHAR(500),
    @DocumentPath NVARCHAR(500) = NULL,
    @UserID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @DocumentTitle = LTRIM(RTRIM(ISNULL(@DocumentTitle, N'')));
    SET @DocumentPath = NULLIF(LTRIM(RTRIM(ISNULL(@DocumentPath, N''))), N'');

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @DocumentTitle = N''
    BEGIN
        RAISERROR('Document title is required.', 16, 1);
        RETURN;
    END

    IF @TDate IS NULL
    BEGIN
        RAISERROR('Date is required.', 16, 1);
        RETURN;
    END

    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
    BEGIN
        SELECT @UnderOrgID = ISNULL(om.UnderOrgID, om.OrgID)
        FROM dbo.OrgMaster om
        WHERE om.OrgID = @OrgID;
    END

    IF @SrNo IS NULL OR @SrNo <= 0
    BEGIN
        SELECT @SrNo = ISNULL(MAX(d.SrNo), 0) + 1
        FROM dbo.DocumentUploadMaster d WITH (UPDLOCK, HOLDLOCK)
        WHERE d.OrgID = @OrgID
          AND ISNULL(d.IsDeleted, 0) = 0;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.DocumentUploadMaster d
        WHERE d.OrgID = @OrgID
          AND ISNULL(d.IsDeleted, 0) = 0
          AND d.SrNo = @SrNo
          AND d.DocumentUploadID <> ISNULL(@DocumentUploadID, 0)
    )
    BEGIN
        RAISERROR('Sr No already exists for this organization.', 16, 1);
        RETURN;
    END

    IF @DocumentUploadID IS NULL OR @DocumentUploadID = 0
    BEGIN
        IF @DocumentPath IS NULL
        BEGIN
            RAISERROR('Document file is required.', 16, 1);
            RETURN;
        END

        INSERT INTO dbo.DocumentUploadMaster (
            OrgID,
            UnderOrgID,
            SrNo,
            TDate,
            DocumentTitle,
            DocumentPath,
            CreatedUserID,
            ModifiedUserID
        )
        VALUES (
            @OrgID,
            @UnderOrgID,
            @SrNo,
            @TDate,
            @DocumentTitle,
            @DocumentPath,
            @UserID,
            @UserID
        );

        SET @DocumentUploadID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.DocumentUploadMaster
        SET OrgID = @OrgID,
            UnderOrgID = @UnderOrgID,
            SrNo = @SrNo,
            TDate = @TDate,
            DocumentTitle = @DocumentTitle,
            DocumentPath = COALESCE(@DocumentPath, DocumentPath),
            ModifiedDate = SYSUTCDATETIME(),
            ModifiedUserID = @UserID
        WHERE DocumentUploadID = @DocumentUploadID
          AND ISNULL(IsDeleted, 0) = 0;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DocumentUpload_Delete
    @DocumentUploadID BIGINT,
    @UserID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.DocumentUploadMaster
    SET IsDeleted = 1,
        ModifiedDate = SYSUTCDATETIME(),
        ModifiedUserID = @UserID
    WHERE DocumentUploadID = @DocumentUploadID
      AND ISNULL(IsDeleted, 0) = 0;
END
GO

PRINT '117_DocumentUploadMaster_Crud applied.';
GO
