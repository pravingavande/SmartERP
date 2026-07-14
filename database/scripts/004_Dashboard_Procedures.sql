-- Dashboard and user profile stored procedures.
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

CREATE OR ALTER PROCEDURE dbo.sp_Dashboard_GetSummary
    @OrgID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Placeholder summary counts until live reporting tables are wired.
    SELECT
        ISNULL(om.OrganizationName, N'Sanstha') AS SansthaName,
        25 AS TotalSchool,
        500 AS TotalStudent,
        200 AS TotalTeacher,
        150 AS TeachingStaff,
        50 AS NonTeachingStaff,
        170 AS PermanentStaff,
        30 AS TemporaryStaff,
        200 AS MaleStudents,
        300 AS FemaleStudents,
        120 AS MaleTeachers,
        80 AS FemaleTeachers
    FROM dbo.OrgMaster om
    WHERE om.OrgID = @OrgID
      AND om.Status = 1;
END
GO
