-- Live hotfix after 037: sync UserMaster.UserRoleID and patch procedures still using UserTypeID.
USE SmartERP;
GO

IF COL_LENGTH('dbo.UserMaster', 'UserTypeID') IS NOT NULL
   AND COL_LENGTH('dbo.UserMaster', 'UserRoleID') IS NOT NULL
BEGIN
    UPDATE dbo.UserMaster
    SET UserRoleID = UserTypeID
    WHERE UserRoleID IS NULL
      AND UserTypeID IS NOT NULL;

    ALTER TABLE dbo.UserMaster DROP COLUMN UserTypeID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetUserOrgs
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AppUserName VARCHAR(50);
    DECLARE @UserRoleID INT;
    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;

    SELECT
        @AppUserName = um.AppUserName,
        @UserOrgID = um.OrgID,
        @UserSchoolCode = um.SchoolCode,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    IF @AppUserName IS NULL
        RETURN;

    SELECT TOP 1
        @UserRoleID = v.UserRoleID
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    WHERE v.AppUserName = @AppUserName
    ORDER BY v.OrgID;

    IF @UserRoleID IN (1, 2)
    BEGIN
        SELECT
            x.OrgID,
            x.OrganizationName,
            x.ShortName,
            x.SchoolCode
        FROM (
            SELECT DISTINCT
                san.OrgID,
                san.OrganizationName,
                san.ShortName,
                san.SchoolCode,
                0 AS SortOrder
            FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
            INNER JOIN dbo.OrgMaster san
                ON san.OrgID = v.OrgGroupID
               AND san.Status = 1
               AND san.OrgID = san.UnderOrgID
            WHERE v.AppUserName = @AppUserName

            UNION ALL

            SELECT DISTINCT
                sch.OrgID,
                sch.OrganizationName,
                sch.ShortName,
                sch.SchoolCode,
                1 AS SortOrder
            FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
            INNER JOIN dbo.OrgMaster sch
                ON sch.UnderOrgID = v.OrgGroupID
               AND sch.Status = 1
               AND sch.OrgID <> sch.UnderOrgID
            WHERE v.AppUserName = @AppUserName
        ) x
        ORDER BY x.SortOrder, x.OrganizationName;
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
       AND sch.OrgID <> sch.UnderOrgID
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
      AND om.OrgID <> om.UnderOrgID
      AND (om.OrgID = @UserOrgID OR om.SchoolCode = @UserSchoolCode)
    ORDER BY om.OrganizationName;
END
GO

PRINT 'UserRole live hotfix applied (038).';
GO
