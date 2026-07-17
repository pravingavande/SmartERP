-- Teacher lookups: include DesignationMaster.LeaveYear for Retirement Year auto-fill
USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_GetLookups
AS
BEGIN
    SET NOCOUNT ON;

    SELECT st.StaffTypeID, st.StaffTypeName
    FROM dbo.StaffTypeMaster st
    WHERE ISNULL(st.IsActive, 1) = 1
    ORDER BY st.StaffTypeName;

    SELECT ur.UserRoleID, ur.UserRoleName
    FROM dbo.UserRoleMaster ur
    WHERE ur.UserRoleID IS NOT NULL
    ORDER BY ur.UserRoleName;

    SELECT
        dm.DesignationID AS DesignationCode,
        dm.DesignationName,
        dm.LeaveYear
    FROM dbo.DesignationMaster dm
    WHERE dm.DesignationID IS NOT NULL AND ISNULL(dm.IsActive, 1) = 1
    ORDER BY dm.DesignationName;

    SELECT gm.GenderID AS GenderCode, gm.GenderName
    FROM dbo.GenderMaster gm
    WHERE gm.GenderID IS NOT NULL AND ISNULL(gm.IsActive, 1) = 1
    ORDER BY gm.GenderName;

    SELECT rm.ReligionID, rm.ReligionName
    FROM dbo.ReligionMaster rm
    WHERE ISNULL(rm.IsActive, 1) = 1
    ORDER BY rm.ReligionName;

    SELECT cm.CategoryID, cm.CategoryName
    FROM dbo.CategoryMaster cm
    WHERE ISNULL(cm.IsActive, 1) = 1
    ORDER BY cm.CategoryName;

    SELECT bg.BloodGroupID, bg.BloodGroupName
    FROM dbo.BloodGroupMaster bg
    WHERE ISNULL(bg.IsActive, 1) = 1
    ORDER BY bg.BloodGroupName;

    SELECT sh.ShiftID, sh.ShiftName
    FROM dbo.ShiftMaster sh
    WHERE ISNULL(sh.IsActive, 1) = 1
    ORDER BY sh.ShiftName;

    SELECT doc.DocumentID AS DocumentCode, doc.DocumentName
    FROM dbo.DocumentMaster doc
    WHERE doc.DocumentID IS NOT NULL AND ISNULL(doc.IsActive, 1) = 1
    ORDER BY doc.DocumentName;
END
GO
