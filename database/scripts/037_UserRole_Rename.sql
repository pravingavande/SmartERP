-- 14 July 2026: Rename UserRoleMaster -> UserRoleMaster, UserRoleID -> UserRoleID, UserRoleName -> UserRoleName
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

IF OBJECT_ID('dbo.UserRoleMaster', 'U') IS NOT NULL
    EXEC sp_rename 'dbo.UserRoleMaster', 'UserRoleMaster';
GO

IF OBJECT_ID('dbo.UserRoleMaster', 'U') IS NOT NULL AND COL_LENGTH('dbo.UserRoleMaster', 'UserRoleID') IS NOT NULL
    EXEC sp_rename 'dbo.UserRoleMaster.UserRoleID', 'UserRoleID', 'COLUMN';
GO

IF OBJECT_ID('dbo.UserRoleMaster', 'U') IS NOT NULL AND COL_LENGTH('dbo.UserRoleMaster', 'UserRoleName') IS NOT NULL
    EXEC sp_rename 'dbo.UserRoleMaster.UserRoleName', 'UserRoleName', 'COLUMN';
GO

IF COL_LENGTH('dbo.UserMaster', 'UserRoleID') IS NOT NULL
    EXEC sp_rename 'dbo.UserMaster.UserRoleID', 'UserRoleID', 'COLUMN';
GO

IF OBJECT_ID('dbo.vw_UserloginWithOrgIDAndORGGROUP', 'V') IS NOT NULL
    DROP VIEW dbo.vw_UserloginWithOrgIDAndORGGROUP;
GO

CREATE VIEW dbo.vw_UserloginWithOrgIDAndORGGROUP
AS
SELECT
    um.OrgID,
    om.UnderOrgID AS OrgGroupID,
    um.AppUserName,
    om.OrganizationName,
    san.OrganizationName AS OrganizationGroupName,
    ur.UserRoleID,
    ur.UserRoleName
FROM dbo.UserMaster um
INNER JOIN dbo.OrgMaster om ON um.OrgID = om.OrgID
INNER JOIN dbo.OrgMaster san ON om.UnderOrgID = san.OrgID
INNER JOIN dbo.UserRoleMaster ur ON um.UserRoleID = ur.UserRoleID;
GO

PRINT 'UserRole rename complete. Re-run updated procedure scripts 021-036 if needed.';
GO
