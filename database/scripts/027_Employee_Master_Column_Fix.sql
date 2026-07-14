-- Fix employee procedures for renamed master-table ID columns.
-- DesignationMaster.DesignationID, GenderMaster.GenderID, EducationMaster.EducationID,
-- DocumentMaster.DocumentID, EducationStatusMaster.EducationStatusID
-- UserMaster still stores DesignationCode / GenderCode (values = master IDs).

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Employee_GetLookups
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ut.UserRoleID,
        ut.UserRoleName
    FROM dbo.UserRoleMaster ut
    WHERE ut.UserRoleID IS NOT NULL
    ORDER BY ut.UserRoleName;

    SELECT
        dm.DesignationID AS DesignationCode,
        dm.DesignationName
    FROM dbo.DesignationMaster dm
    WHERE dm.DesignationID IS NOT NULL
      AND ISNULL(dm.IsActive, 1) = 1
    ORDER BY dm.DesignationName;

    SELECT
        gm.GenderID AS GenderCode,
        gm.GenderName
    FROM dbo.GenderMaster gm
    WHERE gm.GenderID IS NOT NULL
      AND ISNULL(gm.IsActive, 1) = 1
    ORDER BY gm.GenderName;

    SELECT
        em.EducationID AS EducationCode,
        em.EducationName
    FROM dbo.EducationMaster em
    WHERE ISNULL(em.IsActive, 1) = 1
    ORDER BY em.EducationName;

    SELECT
        doc.DocumentID AS DocumentCode,
        doc.DocumentName
    FROM dbo.DocumentMaster doc
    WHERE ISNULL(doc.IsActive, 1) = 1
    ORDER BY doc.DocumentName;

    SELECT
        qt.QualificationTypeCode,
        qt.QualificationTypeName
    FROM dbo.QualificationTypeMaster qt
    WHERE qt.QualificationTypeCode IS NOT NULL
    ORDER BY qt.QualificationTypeName;

    SELECT
        es.EducationStatusID AS EducationStatusCode,
        es.EducationStatusName
    FROM dbo.EducationStatusMaster es
    WHERE es.EducationStatusID IS NOT NULL
      AND ISNULL(es.IsActive, 1) = 1
    ORDER BY es.EducationStatusName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Employee_GetList
    @OrgID BIGINT = NULL,
    @Search NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        um.UserID,
        um.Firstname,
        um.MiddleName,
        um.LastName,
        um.MobileNo1,
        um.OrgID,
        om.OrganizationName,
        um.DesignationCode,
        dm.DesignationName,
        um.UserRoleID,
        ut.UserRoleName,
        um.IsActive
    FROM dbo.UserMaster um
    LEFT JOIN dbo.OrgMaster om
        ON om.OrgID = um.OrgID
       AND om.Status = 1
    LEFT JOIN dbo.DesignationMaster dm
        ON dm.DesignationID = um.DesignationCode
    LEFT JOIN dbo.UserRoleMaster ut
        ON ut.UserRoleID = um.UserRoleID
    WHERE um.IsActive = 1
      AND (@OrgID IS NULL OR um.OrgID = @OrgID)
      AND (
          @Search IS NULL
          OR @Search = ''
          OR um.Firstname LIKE '%' + @Search + '%'
          OR um.LastName LIKE '%' + @Search + '%'
          OR um.MobileNo1 LIKE '%' + @Search + '%'
          OR um.AppUserName LIKE '%' + @Search + '%'
      )
    ORDER BY um.Firstname, um.LastName, um.UserID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_UserMaster_GetProfileByUserId
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        um.UserID,
        um.AppUserName,
        um.Firstname,
        um.MiddleName,
        um.LastName,
        um.EmailID,
        um.MobileNo1,
        um.MobileNo2,
        um.SchoolCode,
        um.OrgID,
        um.DesignationCode,
        um.UserRoleID,
        um.GenderCode,
        um.Dob,
        um.PanNo,
        um.ShalarthID,
        um.IsActive,
        sch.OrganizationName AS SansthaName,
        om.OrganizationName AS SchoolName,
        dm.DesignationName
    FROM dbo.UserMaster um
    LEFT JOIN dbo.OrgMaster om ON um.OrgID = om.OrgID
    LEFT JOIN dbo.OrgMaster sch ON um.SchoolCode = sch.SchoolCode
    LEFT JOIN dbo.DesignationMaster dm ON um.DesignationCode = dm.DesignationID
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;
END
GO
