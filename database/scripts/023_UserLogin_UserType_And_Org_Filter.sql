-- Login: expose UserTypeID / UserTypeName from vw_UserloginWithOrgIDAndORGGROUP.
-- School list: UserTypeID 1,2 = schools under login Sanstha (OrgGroupID); UserTypeID 3 = mapped schools only.
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_UserLogin_GetOrgGroupByAppUserName
    @AppUserName VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        v.OrgID,
        v.OrgGroupID,
        v.AppUserName,
        v.OrganizationName,
        v.OrganizationGroupName,
        v.UserTypeID,
        v.UserTypeName
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    WHERE v.AppUserName = @AppUserName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetUserOrgs
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AppUserName VARCHAR(50);
    DECLARE @UserTypeID INT;
    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;

    SELECT
        @AppUserName = um.AppUserName,
        @UserOrgID = um.OrgID,
        @UserSchoolCode = um.SchoolCode,
        @UserTypeID = um.UserTypeID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    IF @AppUserName IS NULL
        RETURN;

    SELECT TOP 1
        @UserTypeID = v.UserTypeID
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    WHERE v.AppUserName = @AppUserName
    ORDER BY v.OrgID;

    IF @UserTypeID IN (1, 2)
    BEGIN
        SELECT DISTINCT
            om.OrgID,
            om.OrganizationName,
            om.ShortName,
            om.SchoolCode
        FROM dbo.OrgMaster om
        WHERE om.Status = 1
          AND om.OrgID <> om.UnderOrgID
        ORDER BY om.OrganizationName;
        RETURN;
    END

    SELECT DISTINCT
        sch.OrgID,
        sch.OrganizationName,
        sch.ShortName,
        sch.SchoolCode
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    INNER JOIN dbo.OrgMaster sch
        ON sch.OrgID = v.OrgID
       AND sch.Status = 1
    WHERE v.AppUserName = @AppUserName
    ORDER BY sch.OrganizationName;

    IF @@ROWCOUNT > 0
        RETURN;

    SELECT DISTINCT
        om.OrgID,
        om.OrganizationName,
        om.ShortName,
        om.SchoolCode
    FROM dbo.OrgMaster om
    WHERE om.Status = 1
      AND (om.OrgID = @UserOrgID OR om.SchoolCode = @UserSchoolCode)
    ORDER BY om.OrganizationName;
END
GO
