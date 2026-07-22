-- Fix HMOrPrincipal 'Y'/'N' varchar conversion error in designation procs (SP only, no data changes)
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetMaster
    @UnderOrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dm.DesignationID,
        ISNULL(dm.UnderOrgID, 1) AS UnderOrgID,
        ISNULL(dm.SrNo, 0) AS SrNo,
        dm.DesignationName,
        dm.DesignationNameShort,
        dm.LeaveYear,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT) AS HMOrPrincipal,
        ISNULL(dm.IsActive, 1) AS IsActive
    FROM dbo.DesignationMaster dm
    WHERE @UnderOrgID IS NULL
       OR @UnderOrgID = 1
       OR ISNULL(dm.UnderOrgID, 1) = @UnderOrgID
    ORDER BY ISNULL(dm.SrNo, 0), dm.DesignationName, dm.DesignationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetList
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dm.DesignationID,
        ISNULL(dm.UnderOrgID, 1) AS UnderOrgID,
        ISNULL(dm.SrNo, 0) AS SrNo,
        dm.DesignationName,
        dm.DesignationNameShort,
        dm.LeaveYear,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT) AS HMOrPrincipal,
        ISNULL(dm.IsActive, 1) AS IsActive,
        om.OrganizationName
    FROM dbo.DesignationMaster dm
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = dm.UnderOrgID
    WHERE @UnderOrgID = 1
       OR ISNULL(dm.UnderOrgID, 1) = @UnderOrgID
    ORDER BY ISNULL(dm.SrNo, 0), dm.DesignationName, dm.DesignationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetById
    @DesignationID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dm.DesignationID,
        ISNULL(dm.UnderOrgID, 1) AS UnderOrgID,
        ISNULL(dm.SrNo, 0) AS SrNo,
        dm.DesignationName,
        dm.DesignationNameShort,
        dm.LeaveYear,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT) AS HMOrPrincipal,
        ISNULL(dm.IsActive, 1) AS IsActive,
        om.OrganizationName
    FROM dbo.DesignationMaster dm
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = dm.UnderOrgID
    WHERE dm.DesignationID = @DesignationID;
END
GO

PRINT '103_Designation_HMOrPrincipal_Cast_Fix applied.';
GO
