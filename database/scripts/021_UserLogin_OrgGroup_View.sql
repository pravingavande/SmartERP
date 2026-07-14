-- Org / org-group context for login from dbo.vw_UserloginWithOrgIDAndORGGROUP.
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
        v.UserRoleID,
        v.UserRoleName
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    WHERE v.AppUserName = @AppUserName;
END
GO
