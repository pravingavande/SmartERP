-- Software Language setting (M/E) + language key labels
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SoftwareSetting_GetLanguage
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        s.SrNo,
        s.UnderOrgID,
        s.Title,
        s.[Condition],
        s.Description
    FROM dbo.SoftwareSetting s
    WHERE s.Title = N'Software Language'
      AND (s.UnderOrgID = @UnderOrgID OR s.UnderOrgID IS NULL)
    ORDER BY CASE WHEN s.UnderOrgID = @UnderOrgID THEN 0 ELSE 1 END, s.SrNo;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_SoftwareSetting_SaveLanguage
    @UnderOrgID BIGINT,
    @Condition NVARCHAR(20),
    @ModifyBy NVARCHAR(1) = N'O'
AS
BEGIN
    SET NOCOUNT ON;

    IF @Condition NOT IN (N'M', N'E')
    BEGIN
        RAISERROR(N'Condition must be M or E.', 16, 1);
        RETURN;
    END;

    IF EXISTS (
        SELECT 1
        FROM dbo.SoftwareSetting
        WHERE Title = N'Software Language'
          AND UnderOrgID = @UnderOrgID
    )
    BEGIN
        UPDATE dbo.SoftwareSetting
        SET [Condition] = @Condition,
            ModifyBy = @ModifyBy
        WHERE Title = N'Software Language'
          AND UnderOrgID = @UnderOrgID;
    END
    ELSE
    BEGIN
        DECLARE @NextSrNo BIGINT =
        (
            SELECT ISNULL(MAX(SrNo), 0) + 1
            FROM dbo.SoftwareSetting
        );

        INSERT INTO dbo.SoftwareSetting (SrNo, UnderOrgID, Title, [Condition], Description, ModifyBy)
        VALUES (
            @NextSrNo,
            @UnderOrgID,
            N'Software Language',
            @Condition,
            N'M-Marathi Software, E - English Software',
            @ModifyBy
        );
    END;

    SELECT TOP (1)
        s.SrNo,
        s.UnderOrgID,
        s.Title,
        s.[Condition],
        s.Description
    FROM dbo.SoftwareSetting s
    WHERE s.Title = N'Software Language'
      AND s.UnderOrgID = @UnderOrgID
    ORDER BY s.SrNo;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LanguageKeyValue_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        k.ID,
        k.KeyName,
        k.KeyValueMR,
        k.KeyValueEN
    FROM dbo.LanguageKeyValueMaster k
    ORDER BY k.ID;
END
GO

PRINT 'Software language setting procedures ready.';
GO
