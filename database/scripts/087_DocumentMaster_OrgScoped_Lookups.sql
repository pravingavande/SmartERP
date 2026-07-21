-- DocumentMaster: org-scoped document options for School (/schools) and Teacher (/teacher-master)
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organization_GetDocumentsByBusinessCategory
    @BusinessCategoryID INT,
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
    BEGIN
        RAISERROR('Organization scope (UnderOrgID) is required.', 16, 1);
        RETURN;
    END

    DECLARE @DocumentTypeID INT = NULL;

    -- BC 3 = Sanstha documents, BC 2 = School documents
    IF @BusinessCategoryID = 3 SET @DocumentTypeID = 1;
    ELSE IF @BusinessCategoryID = 2 SET @DocumentTypeID = 2;

    SELECT
        dm.DocumentID,
        dm.DocumentName,
        dm.DocumentTypeID
    FROM dbo.DocumentMaster dm
    WHERE ISNULL(dm.IsActive, 1) = 1
      AND ISNULL(dm.UnderOrgID, 1) = @UnderOrgID
      AND (@DocumentTypeID IS NULL OR dm.DocumentTypeID = @DocumentTypeID)
    ORDER BY dm.SrNo, dm.DocumentName, dm.DocumentID;
END
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

    -- Employee (कर्मचारी) documents for teacher master
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

PRINT '087_DocumentMaster_OrgScoped_Lookups applied.';
GO
