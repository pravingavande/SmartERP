-- ============================================================
-- DesignationMaster: org-scoped CRUD + import (source org 1)
-- ============================================================
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.DesignationMaster', 'UnderOrgID') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD UnderOrgID BIGINT NULL;
    PRINT 'Added DesignationMaster.UnderOrgID';
END
GO

IF COL_LENGTH('dbo.DesignationMaster', 'SrNo') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD SrNo BIGINT NULL;
    PRINT 'Added DesignationMaster.SrNo';
END
GO

IF COL_LENGTH('dbo.DesignationMaster', 'DesignationNameShort') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD DesignationNameShort NVARCHAR(50) NULL;
    PRINT 'Added DesignationMaster.DesignationNameShort';
END
GO

IF COL_LENGTH('dbo.DesignationMaster', 'LeaveYear') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD LeaveYear INT NULL;
    PRINT 'Added DesignationMaster.LeaveYear';
END
GO

IF COL_LENGTH('dbo.DesignationMaster', 'HMOrPrincipal') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD HMOrPrincipal BIT NULL;
    PRINT 'Added DesignationMaster.HMOrPrincipal';
END
GO

IF COL_LENGTH('dbo.DesignationMaster', 'IsActive') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD IsActive BIT NULL CONSTRAINT DF_DesignationMaster_IsActive DEFAULT (1);
    PRINT 'Added DesignationMaster.IsActive';
END
GO

UPDATE dbo.DesignationMaster
SET UnderOrgID = 1
WHERE UnderOrgID IS NULL;

UPDATE dbo.DesignationMaster
SET IsActive = 1
WHERE IsActive IS NULL;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetMaster
    @UnderOrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dm.DesignationID,
        dm.UnderOrgID,
        dm.SrNo,
        dm.DesignationName,
        dm.DesignationNameShort,
        dm.LeaveYear,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT) AS HMOrPrincipal,
        dm.IsActive
    FROM dbo.DesignationMaster dm
    WHERE ISNULL(dm.IsActive, 1) = 1
      AND (@UnderOrgID IS NULL OR ISNULL(dm.UnderOrgID, 1) = @UnderOrgID)
    ORDER BY dm.SrNo, dm.DesignationName, dm.DesignationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetList
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dm.DesignationID,
        dm.UnderOrgID,
        dm.SrNo,
        dm.DesignationName,
        dm.DesignationNameShort,
        dm.LeaveYear,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT) AS HMOrPrincipal,
        dm.IsActive,
        om.OrganizationName
    FROM dbo.DesignationMaster dm
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = dm.UnderOrgID
    WHERE ISNULL(dm.UnderOrgID, 1) = @UnderOrgID
    ORDER BY dm.SrNo, dm.DesignationName, dm.DesignationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetById
    @DesignationID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dm.DesignationID,
        dm.UnderOrgID,
        dm.SrNo,
        dm.DesignationName,
        dm.DesignationNameShort,
        dm.LeaveYear,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT) AS HMOrPrincipal,
        dm.IsActive,
        om.OrganizationName
    FROM dbo.DesignationMaster dm
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = dm.UnderOrgID
    WHERE dm.DesignationID = @DesignationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetNextSrNo
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(dm.SrNo), 0) + 1 AS NextSrNo
    FROM dbo.DesignationMaster dm
    WHERE ISNULL(dm.UnderOrgID, 1) = @UnderOrgID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_Save
    @DesignationID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @SrNo BIGINT = NULL,
    @DesignationName NVARCHAR(200),
    @DesignationNameShort NVARCHAR(50) = NULL,
    @LeaveYear INT = NULL,
    @HMOrPrincipal BIT = 0,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @DesignationName = LTRIM(RTRIM(ISNULL(@DesignationName, N'')));
    SET @DesignationNameShort = NULLIF(LTRIM(RTRIM(ISNULL(@DesignationNameShort, N''))), N'');

    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @DesignationName = N''
    BEGIN
        RAISERROR('Designation name is required.', 16, 1);
        RETURN;
    END

    IF @SrNo IS NULL OR @SrNo <= 0
    BEGIN
        SELECT @SrNo = ISNULL(MAX(dm.SrNo), 0) + 1
        FROM dbo.DesignationMaster dm WITH (UPDLOCK, HOLDLOCK)
        WHERE ISNULL(dm.UnderOrgID, 1) = @UnderOrgID;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.DesignationMaster dm
        WHERE ISNULL(dm.UnderOrgID, 1) = @UnderOrgID
          AND dm.SrNo = @SrNo
          AND dm.DesignationID <> ISNULL(@DesignationID, 0)
    )
    BEGIN
        RAISERROR('Sr No already exists for this organization.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.DesignationMaster dm
        WHERE ISNULL(dm.UnderOrgID, 1) = @UnderOrgID
          AND dm.DesignationName = @DesignationName
          AND dm.DesignationID <> ISNULL(@DesignationID, 0)
    )
    BEGIN
        RAISERROR('Designation name already exists for this organization.', 16, 1);
        RETURN;
    END

    IF @DesignationID IS NULL OR @DesignationID = 0
    BEGIN
        INSERT INTO dbo.DesignationMaster (
            UnderOrgID,
            SrNo,
            DesignationName,
            DesignationNameShort,
            LeaveYear,
            HMOrPrincipal,
            IsActive
        )
        VALUES (
            @UnderOrgID,
            @SrNo,
            @DesignationName,
            @DesignationNameShort,
            @LeaveYear,
            @HMOrPrincipal,
            @IsActive
        );

        SET @DesignationID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.DesignationMaster
        SET UnderOrgID = @UnderOrgID,
            SrNo = @SrNo,
            DesignationName = @DesignationName,
            DesignationNameShort = @DesignationNameShort,
            LeaveYear = @LeaveYear,
            HMOrPrincipal = @HMOrPrincipal,
            IsActive = @IsActive
        WHERE DesignationID = @DesignationID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_Delete
    @DesignationID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.DesignationMaster
    SET IsActive = 0
    WHERE DesignationID = @DesignationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_Import
    @DestinationUnderOrgID BIGINT,
    @DesignationIdsJson NVARCHAR(MAX),
    @ImportedCount INT = 0 OUTPUT,
    @SkippedCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @ImportedCount = 0;
    SET @SkippedCount = 0;

    IF @DestinationUnderOrgID IS NULL OR @DestinationUnderOrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @DestinationUnderOrgID = 1
    BEGIN
        RAISERROR('Cannot import into the source organization.', 16, 1);
        RETURN;
    END

    IF @DesignationIdsJson IS NULL OR LTRIM(RTRIM(@DesignationIdsJson)) = N''
       OR LTRIM(RTRIM(@DesignationIdsJson)) = N'[]'
    BEGIN
        RAISERROR('Select at least one designation to import.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    DECLARE @Name NVARCHAR(200);
    DECLARE @Short NVARCHAR(50);
    DECLARE @LeaveYear INT;
    DECLARE @HMOrPrincipal BIT;
    DECLARE @IsActive BIT;
    DECLARE @NextSrNo BIGINT;

    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT
        LTRIM(RTRIM(dm.DesignationName)),
        dm.DesignationNameShort,
        dm.LeaveYear,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT),
        ISNULL(dm.IsActive, 1)
    FROM OPENJSON(@DesignationIdsJson) d
    INNER JOIN dbo.DesignationMaster dm
        ON dm.DesignationID = TRY_CAST(d.value AS BIGINT)
    WHERE ISNULL(dm.UnderOrgID, 1) = 1
      AND ISNULL(dm.IsActive, 1) = 1
      AND TRY_CAST(d.value AS BIGINT) IS NOT NULL
    ORDER BY dm.SrNo, dm.DesignationID;

    OPEN src;
    FETCH NEXT FROM src INTO @Name, @Short, @LeaveYear, @HMOrPrincipal, @IsActive;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @Name IS NULL OR @Name = N''
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END
        ELSE IF EXISTS (
            SELECT 1
            FROM dbo.DesignationMaster dest
            WHERE ISNULL(dest.UnderOrgID, 1) = @DestinationUnderOrgID
              AND dest.DesignationName = @Name
        )
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END
        ELSE
        BEGIN
            SELECT @NextSrNo = ISNULL(MAX(dm.SrNo), 0) + 1
            FROM dbo.DesignationMaster dm WITH (UPDLOCK, HOLDLOCK)
            WHERE ISNULL(dm.UnderOrgID, 1) = @DestinationUnderOrgID;

            INSERT INTO dbo.DesignationMaster (
                UnderOrgID,
                SrNo,
                DesignationName,
                DesignationNameShort,
                LeaveYear,
                HMOrPrincipal,
                IsActive
            )
            VALUES (
                @DestinationUnderOrgID,
                @NextSrNo,
                @Name,
                @Short,
                @LeaveYear,
                @HMOrPrincipal,
                @IsActive
            );

            SET @ImportedCount = @ImportedCount + 1;
        END

        FETCH NEXT FROM src INTO @Name, @Short, @LeaveYear, @HMOrPrincipal, @IsActive;
    END

    CLOSE src;
    DEALLOCATE src;

    COMMIT TRANSACTION;

    SELECT
        @ImportedCount AS ImportedCount,
        @SkippedCount AS SkippedCount;
END
GO

-- Teacher lookups: scope designations by org when provided
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

PRINT '098_DesignationMaster_Crud_Import applied.';
GO
