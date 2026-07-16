-- Fix account register lookup on live schema (OrgMaster.IsActive, not Status).
USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetAccountRegisters
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
        RETURN;

    DECLARE @LookupOrgID BIGINT = @OrgID;

    WHILE @LookupOrgID IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM dbo.ACAccountRegisterOrgWiseDefine ard
            WHERE ard.UnderOrgID = @LookupOrgID
        )
            BREAK;

        SELECT @LookupOrgID = parent.UnderOrgID
        FROM dbo.OrgMaster child
        INNER JOIN dbo.OrgMaster parent ON parent.OrgID = child.UnderOrgID
        WHERE child.OrgID = @LookupOrgID
          AND child.OrgID <> ISNULL(child.UnderOrgID, 0)
          AND ISNULL(parent.IsActive, 1) = 1;

        IF @@ROWCOUNT = 0
            SET @LookupOrgID = NULL;
    END

    SELECT
        arm.AccountRegisterID,
        arm.AccountRegister,
        @OrgID AS OrgID
    FROM dbo.ACAccountRegisterOrgWiseDefine ard
    INNER JOIN dbo.ACAccountRegisterMaster arm ON arm.AccountRegisterID = ard.AccountRegisterID
    WHERE ard.UnderOrgID = @LookupOrgID
      AND ISNULL(arm.IsActive, 1) = 1
    ORDER BY arm.AccountRegister;
END
GO

-- Same Status -> IsActive fix for donation head lookup (school walks up to sanstha).
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
        WHERE ISNULL(dh.IsActive, 1) = 1
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
          AND child.OrgID <> ISNULL(child.UnderOrgID, 0)
          AND ISNULL(parent.IsActive, 1) = 1;

        IF @@ROWCOUNT = 0
            SET @LookupOrgID = NULL;
    END

    SELECT
        dh.DRHeadID,
        dh.DRHeadName
    FROM dbo.DRHeadOrgWiseDefine dhd
    INNER JOIN dbo.DRHeadMaster dh ON dh.DRHeadID = dhd.DRHeadID
    WHERE dhd.UnderOrgID = @LookupOrgID
      AND ISNULL(dh.IsActive, 1) = 1
    ORDER BY dh.DRHeadName;
END
GO
