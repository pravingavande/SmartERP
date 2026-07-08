-- Donation Head org-wise mapping (DRHeadOrgWiseDefine)
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetDRHeadMaster
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dh.DRHeadID,
        dh.DRHeadName
    FROM dbo.DRHeadMaster dh
    WHERE dh.IsActive = 1
    ORDER BY dh.DRHeadName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetDRHeads
    @OrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrgID IS NULL
    BEGIN
        SELECT
            dh.DRHeadID,
            dh.DRHeadName
        FROM dbo.DRHeadMaster dh
        WHERE dh.IsActive = 1
        ORDER BY dh.DRHeadName;
        RETURN;
    END

    DECLARE @LookupOrgID BIGINT = @OrgID;

    WHILE @LookupOrgID IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM dbo.DRHeadOrgWiseDefine dhd
            WHERE dhd.UnderOrgID = @LookupOrgID
        )
            BREAK;

        SELECT @LookupOrgID = parent.UnderOrgID
        FROM dbo.OrgMaster child
        INNER JOIN dbo.OrgMaster parent ON parent.OrgID = child.UnderOrgID
        WHERE child.OrgID = @LookupOrgID
          AND child.OrgID <> child.UnderOrgID
          AND parent.Status = 1;

        IF @@ROWCOUNT = 0
            SET @LookupOrgID = NULL;
    END

    SELECT
        dh.DRHeadID,
        dh.DRHeadName
    FROM dbo.DRHeadOrgWiseDefine dhd
    INNER JOIN dbo.DRHeadMaster dh ON dh.DRHeadID = dhd.DRHeadID
    WHERE dhd.UnderOrgID = @LookupOrgID
      AND dh.IsActive = 1
    ORDER BY dh.DRHeadName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_DRHeadDefine_GetByOrg
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dhd.DRHeadID,
        dh.DRHeadName
    FROM dbo.DRHeadOrgWiseDefine dhd
    INNER JOIN dbo.DRHeadMaster dh ON dh.DRHeadID = dhd.DRHeadID
    WHERE dhd.UnderOrgID = @OrgID
      AND dh.IsActive = 1
    ORDER BY dh.DRHeadName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_DRHeadDefine_Save
    @OrgID BIGINT,
    @DRHeadIdsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DELETE FROM dbo.DRHeadOrgWiseDefine
    WHERE UnderOrgID = @OrgID;

    INSERT INTO dbo.DRHeadOrgWiseDefine (UnderOrgID, DRHeadID)
    SELECT
        @OrgID,
        CAST(d.value AS BIGINT)
    FROM OPENJSON(@DRHeadIdsJson) d
    WHERE TRY_CAST(d.value AS BIGINT) IS NOT NULL;

    COMMIT TRANSACTION;
END
GO
