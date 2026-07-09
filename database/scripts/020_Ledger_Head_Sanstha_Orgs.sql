-- Ledger Head Master: Sanstha org list (OrgID = UnderOrgID only)

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetSansthaOrgs
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @SansthaOrgID BIGINT;
    DECLARE @IsSansthaUser BIT = 0;

    SELECT
        @UserOrgID = um.OrgID,
        @UserSchoolCode = um.SchoolCode
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

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
              WHERE sch.SchoolCode = @UserSchoolCode
                AND sch.Status = 1
                AND sch.UnderOrgID = s.OrgID
          )
      )
    ORDER BY s.OrgID;

    IF @SansthaOrgID IS NULL
    BEGIN
        SELECT @SansthaOrgID = om.UnderOrgID
        FROM dbo.OrgMaster om
        WHERE om.OrgID = @UserOrgID
          AND om.Status = 1;

        IF @SansthaOrgID IS NULL
            SET @SansthaOrgID = @UserOrgID;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND (
              s.SchoolCode = @UserSchoolCode
              OR @UserOrgID = @SansthaOrgID
          )
    )
        SET @IsSansthaUser = 1;

    SELECT DISTINCT
        san.OrgID,
        san.OrganizationName,
        san.ShortName,
        san.SchoolCode,
        san.UnderOrgID
    FROM dbo.OrgMaster san
    WHERE san.Status = 1
      AND san.OrgID = san.UnderOrgID
      AND (
          (@IsSansthaUser = 1 AND san.OrgID = @SansthaOrgID)
          OR (
              @IsSansthaUser = 0
              AND EXISTS (
                  SELECT 1
                  FROM dbo.OrgMaster om
                  WHERE om.Status = 1
                    AND om.UnderOrgID = san.OrgID
                    AND (om.OrgID = @UserOrgID OR om.SchoolCode = @UserSchoolCode)
              )
          )
      )
    ORDER BY san.OrganizationName;
END
GO
