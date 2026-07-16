-- Super Admin Sanstha Onboarding
-- 1) App SuperAdmin role + seed users
-- 2) Create Sanstha + Owner (UserRoleID=1) in one SP
-- 3) Fix Sanstha lookup so Owner can pick Under Sanstha when adding schools
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

-- App Super Admin role (global PathSoft operators)
DECLARE @SuperAdminRoleID INT =
(
    SELECT TOP (1) ur.UserRoleID
    FROM dbo.UserRoleMaster ur
    WHERE ur.UserRoleName = N'SuperAdmin'
);

IF @SuperAdminRoleID IS NULL
BEGIN
    SET IDENTITY_INSERT dbo.UserRoleMaster ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.UserRoleMaster WHERE UserRoleID = 5)
        INSERT INTO dbo.UserRoleMaster (UserRoleID, UserRoleName, IsActive)
        VALUES (5, N'SuperAdmin', 1);
    ELSE
        UPDATE dbo.UserRoleMaster SET UserRoleName = N'SuperAdmin', IsActive = 1 WHERE UserRoleID = 5;
    SET IDENTITY_INSERT dbo.UserRoleMaster OFF;
    SET @SuperAdminRoleID = 5;
END

-- Seed Super Admin logins under PathSoft org (OrgID = 1)
DECLARE @SuperOrgID BIGINT = 1;

-- Prefer 10-digit mobile 8806382486 (correct login); migrate old 11-digit typo if present
IF EXISTS (SELECT 1 FROM dbo.UserMaster WHERE AppUserName = N'88063828486')
   AND NOT EXISTS (SELECT 1 FROM dbo.UserMaster WHERE AppUserName = N'8806382486')
BEGIN
    UPDATE dbo.UserMaster
    SET AppUserName = N'8806382486',
        AppPassword = N'8806382486',
        MobileNo1 = N'8806382486',
        OrgID = @SuperOrgID,
        UserRoleID = @SuperAdminRoleID,
        IsActive = 1
    WHERE AppUserName = N'88063828486';
END

IF NOT EXISTS (SELECT 1 FROM dbo.UserMaster WHERE AppUserName = N'8806382486')
BEGIN
    INSERT INTO dbo.UserMaster (
        OrgID, Firstname, LastName, EmployeeName, MobileNo1,
        UserRoleID, AppUserName, AppPassword, IsActive, StaffTypeID, CreatedAt
    )
    VALUES (
        @SuperOrgID, N'Super', N'Admin', N'Super Admin', N'8806382486',
        @SuperAdminRoleID, N'8806382486', N'8806382486', 1, NULL, SYSUTCDATETIME()
    );
END
ELSE
BEGIN
    UPDATE dbo.UserMaster
    SET OrgID = @SuperOrgID,
        UserRoleID = @SuperAdminRoleID,
        AppPassword = N'8806382486',
        IsActive = 1,
        Firstname = ISNULL(NULLIF(LTRIM(RTRIM(Firstname)), N''), N'Super'),
        LastName = ISNULL(NULLIF(LTRIM(RTRIM(LastName)), N''), N'Admin'),
        MobileNo1 = N'8806382486'
    WHERE AppUserName = N'8806382486';
END

IF NOT EXISTS (SELECT 1 FROM dbo.UserMaster WHERE AppUserName = N'9970772060')
BEGIN
    INSERT INTO dbo.UserMaster (
        OrgID, Firstname, LastName, EmployeeName, MobileNo1,
        UserRoleID, AppUserName, AppPassword, IsActive, StaffTypeID, CreatedAt
    )
    VALUES (
        @SuperOrgID, N'Super', N'Admin', N'Super Admin', N'9970772060',
        @SuperAdminRoleID, N'9970772060', N'9970772060', 1, NULL, SYSUTCDATETIME()
    );
END
ELSE
BEGIN
    UPDATE dbo.UserMaster
    SET OrgID = @SuperOrgID,
        UserRoleID = @SuperAdminRoleID,
        AppPassword = N'9970772060',
        IsActive = 1,
        Firstname = ISNULL(NULLIF(LTRIM(RTRIM(Firstname)), N''), N'Super'),
        LastName = ISNULL(NULLIF(LTRIM(RTRIM(LastName)), N''), N'Admin'),
        MobileNo1 = N'9970772060'
    WHERE AppUserName = N'9970772060';
END
GO

-- Sanstha list for Organization Master: self-parented orgs (live uses BC=2 for education Sanstha)
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
      AND om.OrgID = om.UnderOrgID
    ORDER BY om.OrganizationName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_SuperAdmin_CreateSansthaWithOwner
    @SansthaName NVARCHAR(255),
    @SchoolCategoryID BIGINT = NULL,
    @OwnerFirstName NVARCHAR(100),
    @OwnerMiddleName NVARCHAR(100) = NULL,
    @OwnerLastName NVARCHAR(100),
    @OwnerMobile NVARCHAR(20),
    @OwnerPassword NVARCHAR(100),
    @CreatedByUserID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @SansthaName IS NULL OR LTRIM(RTRIM(@SansthaName)) = N''
        THROW 52001, 'Sanstha name is required.', 1;

    IF @OwnerFirstName IS NULL OR LTRIM(RTRIM(@OwnerFirstName)) = N''
        THROW 52002, 'Owner first name is required.', 1;

    IF @OwnerLastName IS NULL OR LTRIM(RTRIM(@OwnerLastName)) = N''
        THROW 52003, 'Owner last name is required.', 1;

    IF @OwnerMobile IS NULL OR LTRIM(RTRIM(@OwnerMobile)) = N'' OR LEN(LTRIM(RTRIM(@OwnerMobile))) <> 10
        THROW 52004, 'Owner mobile must be exactly 10 digits (used as login username).', 1;

    IF @OwnerPassword IS NULL OR LTRIM(RTRIM(@OwnerPassword)) = N''
        THROW 52005, 'Owner password is required.', 1;

    IF EXISTS (SELECT 1 FROM dbo.UserMaster WHERE AppUserName = LTRIM(RTRIM(@OwnerMobile)))
        THROW 52006, 'Owner mobile/username already exists.', 1;

    IF @SchoolCategoryID IS NULL OR @SchoolCategoryID <= 0
    BEGIN
        SELECT TOP (1) @SchoolCategoryID = sc.SchoolCategoryID
        FROM dbo.SchoolCategoryMaster sc
        WHERE ISNULL(sc.IsActive, 1) = 1
          AND sc.SchoolCategoryID > 0
        ORDER BY sc.SchoolCategoryID;
    END

    IF @SchoolCategoryID IS NULL OR @SchoolCategoryID <= 0
        THROW 52007, 'School category is required.', 1;

    BEGIN TRANSACTION;

    DECLARE @SansthaOrgID BIGINT;
    DECLARE @OwnerUserID BIGINT;
    DECLARE @EmployeeName NVARCHAR(300) =
        LTRIM(RTRIM(
            CONCAT(
                LTRIM(RTRIM(@OwnerFirstName)), N' ',
                CASE WHEN @OwnerMiddleName IS NULL OR LTRIM(RTRIM(@OwnerMiddleName)) = N'' THEN N'' ELSE LTRIM(RTRIM(@OwnerMiddleName)) + N' ' END,
                LTRIM(RTRIM(@OwnerLastName))
            )
        ));

    -- App Sanstha = BusinessCategoryID 3, self-parented (UnderOrgID = OrgID)
    INSERT INTO dbo.OrgMaster (
        BusinessCategoryID, UnderOrgID, SrNo, SchoolCategoryID,
        OrganizationName, IsActive
    )
    VALUES (
        3, 0, 0, @SchoolCategoryID,
        LTRIM(RTRIM(@SansthaName)), 1
    );

    SET @SansthaOrgID = SCOPE_IDENTITY();

    UPDATE dbo.OrgMaster
    SET UnderOrgID = @SansthaOrgID
    WHERE OrgID = @SansthaOrgID;

    -- Default language setting for new Sanstha (SrNo is IDENTITY)
    IF NOT EXISTS (
        SELECT 1 FROM dbo.SoftwareSetting
        WHERE Title = N'Software Language' AND UnderOrgID = @SansthaOrgID
    )
    BEGIN
        INSERT INTO dbo.SoftwareSetting (UnderOrgID, Title, Condition, Description, ModifyBy)
        VALUES (
            @SansthaOrgID,
            N'Software Language',
            N'E',
            N'M-Marathi Software, E - English Software',
            N'O'
        );
    END

    INSERT INTO dbo.UserMaster (
        OrgID, Firstname, MiddleName, LastName, EmployeeName, MobileNo1,
        UserRoleID, AppUserName, AppPassword, IsActive, StaffTypeID, CreatedAt
    )
    VALUES (
        @SansthaOrgID,
        LTRIM(RTRIM(@OwnerFirstName)),
        NULLIF(LTRIM(RTRIM(@OwnerMiddleName)), N''),
        LTRIM(RTRIM(@OwnerLastName)),
        @EmployeeName,
        LTRIM(RTRIM(@OwnerMobile)),
        1, -- Owner
        LTRIM(RTRIM(@OwnerMobile)),
        LTRIM(RTRIM(@OwnerPassword)),
        1,
        NULL,
        SYSUTCDATETIME()
    );

    SET @OwnerUserID = SCOPE_IDENTITY();

    COMMIT TRANSACTION;

    SELECT
        @SansthaOrgID AS SansthaOrgID,
        (SELECT OrganizationName FROM dbo.OrgMaster WHERE OrgID = @SansthaOrgID) AS SansthaName,
        @OwnerUserID AS OwnerUserID,
        LTRIM(RTRIM(@OwnerMobile)) AS OwnerUserName,
        @EmployeeName AS OwnerDisplayName,
        CAST(1 AS INT) AS OwnerUserRoleID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_SuperAdmin_GetSansthaOwnerList
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        om.OrgID AS SansthaOrgID,
        om.OrganizationName AS SansthaName,
        om.SrNo,
        om.IsActive AS SansthaIsActive,
        um.UserID AS OwnerUserID,
        um.Firstname AS OwnerFirstName,
        um.MiddleName AS OwnerMiddleName,
        um.LastName AS OwnerLastName,
        um.EmployeeName AS OwnerDisplayName,
        um.AppUserName AS OwnerUserName,
        um.MobileNo1 AS OwnerMobile,
        um.IsActive AS OwnerIsActive,
        um.CreatedAt AS OwnerCreatedAt
    FROM dbo.OrgMaster om
    INNER JOIN dbo.UserMaster um
        ON um.OrgID = om.OrgID
       AND um.UserRoleID = 1
    WHERE om.OrgID = om.UnderOrgID
      AND ISNULL(om.IsActive, 1) = 1
      AND ISNULL(um.IsActive, 1) = 1
    ORDER BY om.OrganizationName, um.UserID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_SuperAdmin_GetSchoolCategories
AS
BEGIN
    SET NOCOUNT ON;

    SELECT sc.SchoolCategoryID, sc.SchoolCategoryName
    FROM dbo.SchoolCategoryMaster sc
    WHERE ISNULL(sc.IsActive, 1) = 1
      AND sc.SchoolCategoryID > 0
    ORDER BY sc.SchoolCategoryID;
END
GO

PRINT 'Super Admin Sanstha onboarding ready.';
GO
