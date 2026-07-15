-- Organization Master: CRUD, lookups, documents (live schema: OrgDocument has OrgID, DocumentID, DocumentPath).
USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organization_GetLookups
AS
BEGIN
    SET NOCOUNT ON;

    SELECT bc.BusinessCategoryID, bc.CategoryName AS BusinessCategoryName
    FROM dbo.BusinessCategoryMaster bc
    WHERE ISNULL(bc.Status, 1) = 1
    ORDER BY bc.BusinessCategoryID;

    SELECT sc.SchoolCategoryID, sc.SchoolCategoryName
    FROM dbo.SchoolCategoryMaster sc
    WHERE ISNULL(sc.IsActive, 1) = 1
    ORDER BY sc.SchoolCategoryID;

    SELECT om.OrgID, om.OrganizationName, om.BusinessCategoryID, om.UnderOrgID
    FROM dbo.OrgMaster om
    WHERE ISNULL(om.IsActive, 1) = 1
      AND om.BusinessCategoryID = 3
      AND om.OrgID = om.UnderOrgID
    ORDER BY om.OrganizationName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organization_GetDocumentsByBusinessCategory
    @BusinessCategoryID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DocumentTypeID INT = NULL;

    IF @BusinessCategoryID = 3 SET @DocumentTypeID = 1;
    ELSE IF @BusinessCategoryID = 2 SET @DocumentTypeID = 2;

    SELECT dm.DocumentID, dm.DocumentName, dm.DocumentTypeID
    FROM dbo.DocumentMaster dm
    WHERE ISNULL(dm.IsActive, 1) = 1
      AND (@DocumentTypeID IS NULL OR dm.DocumentTypeID = @DocumentTypeID)
    ORDER BY dm.SrNo, dm.DocumentName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organization_GetNextSrNo
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NextSrNo BIGINT;
    SELECT @NextSrNo = ISNULL(MAX(om.SrNo), 0) + 1
    FROM dbo.OrgMaster om
    WHERE om.UnderOrgID = @UnderOrgID;

    SELECT ISNULL(@NextSrNo, 1) AS NextSrNo;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organization_GetList
    @Search NVARCHAR(200) = NULL,
    @BusinessCategoryID INT = NULL,
    @SchoolCategoryID BIGINT = NULL,
    @UnderOrgID BIGINT = NULL,
    @CityName NVARCHAR(100) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        om.OrgID,
        om.BusinessCategoryID,
        bc.CategoryName AS BusinessCategoryName,
        om.UnderOrgID,
        parent.OrganizationName AS UnderOrgName,
        om.SrNo,
        om.SchoolCategoryID,
        sc.SchoolCategoryName,
        om.OrganizationName,
        om.Address,
        om.CityName,
        om.UDiesNo,
        om.SchoolTinNo,
        om.SharlarthID,
        om.PanNo,
        om.EmailID,
        om.PhoneNo,
        om.MobileNo,
        om.WebSite,
        om.EstablishmentYear,
        om.RegNo,
        om.Permission80G,
        om.Remark,
        om.IsActive
    FROM dbo.OrgMaster om
    LEFT JOIN dbo.BusinessCategoryMaster bc ON bc.BusinessCategoryID = om.BusinessCategoryID
    LEFT JOIN dbo.SchoolCategoryMaster sc ON sc.SchoolCategoryID = om.SchoolCategoryID
    LEFT JOIN dbo.OrgMaster parent ON parent.OrgID = om.UnderOrgID
    WHERE (@BusinessCategoryID IS NULL OR om.BusinessCategoryID = @BusinessCategoryID)
      AND (@SchoolCategoryID IS NULL OR om.SchoolCategoryID = @SchoolCategoryID)
      AND (@UnderOrgID IS NULL OR om.UnderOrgID = @UnderOrgID)
      AND (@CityName IS NULL OR @CityName = '' OR om.CityName LIKE '%' + @CityName + '%')
      AND (@IsActive IS NULL OR om.IsActive = @IsActive)
      AND (
          @Search IS NULL OR @Search = ''
          OR om.OrganizationName LIKE '%' + @Search + '%'
          OR om.CityName LIKE '%' + @Search + '%'
          OR om.SharlarthID LIKE '%' + @Search + '%'
          OR om.UDiesNo LIKE '%' + @Search + '%'
      )
    ORDER BY om.UnderOrgID, om.SrNo, om.OrganizationName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organization_GetById
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        om.OrgID,
        om.BusinessCategoryID,
        bc.CategoryName AS BusinessCategoryName,
        om.UnderOrgID,
        parent.OrganizationName AS UnderOrgName,
        om.SrNo,
        om.SchoolCategoryID,
        sc.SchoolCategoryName,
        om.OrganizationName,
        om.Address,
        om.CityName,
        om.UDiesNo,
        om.SchoolTinNo,
        om.SharlarthID,
        om.PanNo,
        om.EmailID,
        om.PhoneNo,
        om.MobileNo,
        om.WebSite,
        om.EstablishmentYear,
        om.RegNo,
        om.Permission80G,
        om.Remark,
        om.IsActive
    FROM dbo.OrgMaster om
    LEFT JOIN dbo.BusinessCategoryMaster bc ON bc.BusinessCategoryID = om.BusinessCategoryID
    LEFT JOIN dbo.SchoolCategoryMaster sc ON sc.SchoolCategoryID = om.SchoolCategoryID
    LEFT JOIN dbo.OrgMaster parent ON parent.OrgID = om.UnderOrgID
    WHERE om.OrgID = @OrgID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organization_Document_GetByOrgId
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        od.OrgID,
        od.DocumentID,
        dm.DocumentName,
        od.DocumentPath
    FROM dbo.OrgDocument od
    LEFT JOIN dbo.DocumentMaster dm ON dm.DocumentID = od.DocumentID
    WHERE od.OrgID = @OrgID
    ORDER BY dm.SrNo, dm.DocumentName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organization_Save
    @OrgID BIGINT = NULL OUTPUT,
    @BusinessCategoryID INT,
    @UnderOrgID BIGINT = NULL,
    @SchoolCategoryID BIGINT = NULL,
    @OrganizationName NVARCHAR(255),
    @Address NVARCHAR(500) = NULL,
    @CityName NVARCHAR(100) = NULL,
    @UDiesNo NVARCHAR(50) = NULL,
    @SchoolTinNo NVARCHAR(50) = NULL,
    @SharlarthID NVARCHAR(50) = NULL,
    @PanNo NVARCHAR(50) = NULL,
    @EmailID NVARCHAR(100) = NULL,
    @PhoneNo NVARCHAR(50) = NULL,
    @MobileNo NVARCHAR(50) = NULL,
    @WebSite NVARCHAR(255) = NULL,
    @EstablishmentYear NVARCHAR(10) = NULL,
    @RegNo NVARCHAR(100) = NULL,
    @Permission80G NVARCHAR(100) = NULL,
    @Remark NVARCHAR(MAX) = NULL,
    @IsActive BIT = 1,
    @DocumentsJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @BusinessCategoryID IS NULL OR @BusinessCategoryID <= 0
        THROW 51001, 'Business Category is required.', 1;

    IF @OrganizationName IS NULL OR LTRIM(RTRIM(@OrganizationName)) = ''
        THROW 51002, 'Organization Name is required.', 1;

    IF @SchoolCategoryID IS NULL
        THROW 51003, 'School Category is required.', 1;

    IF @BusinessCategoryID = 2 AND (@UnderOrgID IS NULL OR @UnderOrgID <= 0)
        THROW 51004, 'Under Sanstha is required.', 1;

    BEGIN TRANSACTION;

    DECLARE @SrNo BIGINT = 1;

    IF @OrgID IS NULL OR @OrgID = 0
    BEGIN
        IF @BusinessCategoryID = 3
        BEGIN
            SET @UnderOrgID = NULL;
            SET @SrNo = 0;
        END
        ELSE
        BEGIN
            SELECT @SrNo = ISNULL(MAX(om.SrNo), 0) + 1
            FROM dbo.OrgMaster om
            WHERE om.UnderOrgID = @UnderOrgID;
        END

        INSERT INTO dbo.OrgMaster (
            BusinessCategoryID, UnderOrgID, SrNo, SchoolCategoryID,
            OrganizationName, Address, CityName, UDiesNo, SchoolTinNo, SharlarthID,
            PanNo, EmailID, PhoneNo, MobileNo, WebSite, EstablishmentYear,
            RegNo, Permission80G, Remark, IsActive
        )
        VALUES (
            @BusinessCategoryID,
            ISNULL(@UnderOrgID, 0),
            @SrNo,
            @SchoolCategoryID,
            LTRIM(RTRIM(@OrganizationName)),
            @Address, @CityName, @UDiesNo, @SchoolTinNo, @SharlarthID,
            @PanNo, @EmailID, @PhoneNo, @MobileNo, @WebSite, @EstablishmentYear,
            @RegNo, @Permission80G, @Remark, @IsActive
        );

        SET @OrgID = SCOPE_IDENTITY();

        IF @BusinessCategoryID = 3
        BEGIN
            UPDATE dbo.OrgMaster
            SET UnderOrgID = @OrgID,
                SrNo = ISNULL(SrNo, 0)
            WHERE OrgID = @OrgID;
        END
    END
    ELSE
    BEGIN
        UPDATE dbo.OrgMaster
        SET
            BusinessCategoryID = @BusinessCategoryID,
            UnderOrgID = CASE WHEN @BusinessCategoryID = 3 THEN @OrgID ELSE @UnderOrgID END,
            SchoolCategoryID = @SchoolCategoryID,
            OrganizationName = LTRIM(RTRIM(@OrganizationName)),
            Address = @Address,
            CityName = @CityName,
            UDiesNo = @UDiesNo,
            SchoolTinNo = @SchoolTinNo,
            SharlarthID = @SharlarthID,
            PanNo = @PanNo,
            EmailID = @EmailID,
            PhoneNo = @PhoneNo,
            MobileNo = @MobileNo,
            WebSite = @WebSite,
            EstablishmentYear = @EstablishmentYear,
            RegNo = @RegNo,
            Permission80G = @Permission80G,
            Remark = @Remark,
            IsActive = @IsActive
        WHERE OrgID = @OrgID;
    END

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

CREATE OR ALTER PROCEDURE dbo.sp_Organization_Delete
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OrgMaster SET IsActive = 0 WHERE OrgID = @OrgID;
END
GO

PRINT 'Organization Master procedures deployed.';
GO
