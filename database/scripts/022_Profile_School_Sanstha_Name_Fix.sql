-- Fix profile school/sanstha names: um.OrgID = school, um.SchoolCode = sanstha (parent org).
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
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
        um.UserTypeID,
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
    LEFT JOIN dbo.DesignationMaster dm ON um.DesignationCode = dm.DesignationCode
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;
END
GO
