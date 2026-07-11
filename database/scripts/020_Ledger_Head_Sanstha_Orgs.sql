-- Ledger Head Master: Sanstha org list (UnderOrgID = sanstha root; OrgGroupID from login view).
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetSansthaOrgs
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AppUserName VARCHAR(50);
    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @SansthaOrgID BIGINT;

    SELECT
        @AppUserName = um.AppUserName,
        @UserOrgID = um.OrgID,
        @UserSchoolCode = um.SchoolCode
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    IF @AppUserName IS NULL
        RETURN;

    SELECT DISTINCT
        san.OrgID,
        san.OrganizationName,
        san.ShortName,
        san.SchoolCode,
        san.UnderOrgID
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    INNER JOIN dbo.OrgMaster san
        ON san.OrgID = v.OrgGroupID
       AND san.Status = 1
       AND san.OrgID = san.UnderOrgID
    WHERE v.AppUserName = @AppUserName
    ORDER BY san.OrganizationName;

    IF @@ROWCOUNT > 0
        RETURN;

    SELECT TOP 1
        @SansthaOrgID = s.OrgID
    FROM dbo.OrgMaster s
    WHERE s.Status = 1
      AND s.OrgID = s.UnderOrgID
      AND (
          s.SchoolCode = @UserSchoolCode
          OR EXISTS (
              SELECT 1
              FROM dbo.OrgMaster sch
              WHERE sch.OrgID = @UserOrgID
                AND sch.Status = 1
                AND sch.UnderOrgID = s.OrgID
          )
      )
    ORDER BY s.OrgID;

    IF @SansthaOrgID IS NULL
        RETURN;

    SELECT
        san.OrgID,
        san.OrganizationName,
        san.ShortName,
        san.SchoolCode,
        san.UnderOrgID
    FROM dbo.OrgMaster san
    WHERE san.OrgID = @SansthaOrgID
      AND san.Status = 1
      AND san.OrgID = san.UnderOrgID;
END
GO
