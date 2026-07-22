-- Restore sp_Teacher_GetLookups after 098 accidentally dropped Documents + AppointmentGroup result sets.
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_GetLookups
    @UnderOrgID BIGINT = NULL
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
    WHERE dm.DesignationID IS NOT NULL
      AND ISNULL(dm.IsActive, 1) = 1
      AND (@UnderOrgID IS NULL OR ISNULL(dm.UnderOrgID, 1) = @UnderOrgID)
    ORDER BY dm.SrNo, dm.DesignationName;

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
    WHERE doc.DocumentID IS NOT NULL
      AND ISNULL(doc.IsActive, 1) = 1
      AND @UnderOrgID IS NOT NULL
      AND @UnderOrgID > 0
      AND ISNULL(doc.UnderOrgID, 1) = @UnderOrgID
      AND doc.DocumentTypeID = 3
    ORDER BY doc.SrNo, doc.DocumentName, doc.DocumentID;

    SELECT ag.AGID, ag.AGName
    FROM dbo.AppointmentGroupMaster ag
    WHERE ISNULL(ag.IsActive, 1) = 1
    ORDER BY ISNULL(ag.SrNo, ag.AGID), ag.AGID;
END
GO

PRINT '101_Teacher_GetLookups_Restore applied.';
GO
