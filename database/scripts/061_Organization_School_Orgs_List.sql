-- Schools list: selected Org / School matches the org itself OR children under it
-- (same school-scoped pattern as Teacher Master dropdown).
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
        CASE
            WHEN TRY_CAST(om.CityName AS BIGINT) IS NOT NULL AND cm.CityName IS NOT NULL THEN cm.CityName
            ELSE om.CityName
        END AS CityName,
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
    LEFT JOIN dbo.CityMaster cm
        ON cm.CityCode = TRY_CAST(om.CityName AS BIGINT)
       AND ISNULL(cm.DeleteFlag, 'N') NOT IN ('Y', 'y')
    WHERE (@BusinessCategoryID IS NULL OR om.BusinessCategoryID = @BusinessCategoryID)
      AND (@SchoolCategoryID IS NULL OR om.SchoolCategoryID = @SchoolCategoryID)
      AND (
            @UnderOrgID IS NULL
            OR om.OrgID = @UnderOrgID
            OR om.UnderOrgID = @UnderOrgID
          )
      AND (
          @CityName IS NULL OR @CityName = ''
          OR om.CityName LIKE '%' + @CityName + '%'
          OR cm.CityName LIKE '%' + @CityName + '%'
      )
      AND (@IsActive IS NULL OR om.IsActive = @IsActive)
      AND (
          @Search IS NULL OR @Search = ''
          OR om.OrganizationName LIKE '%' + @Search + '%'
          OR om.CityName LIKE '%' + @Search + '%'
          OR cm.CityName LIKE '%' + @Search + '%'
          OR om.SharlarthID LIKE '%' + @Search + '%'
          OR om.UDiesNo LIKE '%' + @Search + '%'
      )
    ORDER BY om.UnderOrgID, om.SrNo, om.OrganizationName;
END
GO

PRINT 'sp_Organization_GetList updated for Org / School scope (OrgID or UnderOrgID).';
