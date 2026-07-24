-- Dashboard documents panel: list recent uploads scoped to user org access
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_DocumentUpload_GetDashboardDocuments
    @UserID BIGINT,
    @TopCount INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF @TopCount IS NULL OR @TopCount < 1 SET @TopCount = 20;
    IF @TopCount > 50 SET @TopCount = 50;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @SansthaOrgID BIGINT;

    SELECT
        @UserOrgID = um.OrgID,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT @SansthaOrgID = om.UnderOrgID
    FROM dbo.OrgMaster om
    WHERE om.OrgID = @UserOrgID
      AND ISNULL(om.IsActive, 1) = 1;

    IF @SansthaOrgID IS NULL
        SET @SansthaOrgID = @UserOrgID;

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND ISNULL(s.IsActive, 1) = 1
    )
    AND (
        @UserOrgID = @SansthaOrgID
        OR @UserRoleID IN (1, 2)
    )
        SET @IsSansthaUser = 1;

    SELECT TOP (@TopCount)
        d.DocumentUploadID,
        d.DocumentTitle,
        d.CreatedDate,
        d.DocumentPath,
        om.OrganizationName
    FROM dbo.DocumentUploadMaster d
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = d.OrgID
    WHERE ISNULL(d.IsDeleted, 0) = 0
      AND NULLIF(LTRIM(RTRIM(d.DocumentPath)), N'') IS NOT NULL
      AND (
          (
              @IsSansthaUser = 1
              AND (
                  d.UnderOrgID = @SansthaOrgID
                  OR d.OrgID = @SansthaOrgID
                  OR EXISTS (
                      SELECT 1
                      FROM dbo.OrgMaster school
                      WHERE school.OrgID = d.OrgID
                        AND school.UnderOrgID = @SansthaOrgID
                        AND ISNULL(school.IsActive, 1) = 1
                  )
              )
          )
          OR d.OrgID = @UserOrgID
      )
    ORDER BY d.CreatedDate DESC, d.DocumentUploadID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DocumentUpload_CanUserAccessFile
    @UserID BIGINT,
    @DocumentPath NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @SansthaOrgID BIGINT;

    SET @DocumentPath = NULLIF(LTRIM(RTRIM(ISNULL(@DocumentPath, N''))), N'');

    IF @DocumentPath IS NULL
    BEGIN
        SELECT CAST(0 AS BIT) AS CanAccess;
        RETURN;
    END

    SELECT
        @UserOrgID = um.OrgID,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT @SansthaOrgID = om.UnderOrgID
    FROM dbo.OrgMaster om
    WHERE om.OrgID = @UserOrgID
      AND ISNULL(om.IsActive, 1) = 1;

    IF @SansthaOrgID IS NULL
        SET @SansthaOrgID = @UserOrgID;

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND ISNULL(s.IsActive, 1) = 1
    )
    AND (
        @UserOrgID = @SansthaOrgID
        OR @UserRoleID IN (1, 2)
    )
        SET @IsSansthaUser = 1;

    SELECT CAST(CASE
        WHEN EXISTS (
            SELECT 1
            FROM dbo.DocumentUploadMaster d
            WHERE ISNULL(d.IsDeleted, 0) = 0
              AND d.DocumentPath = @DocumentPath
              AND (
                  (
                      @IsSansthaUser = 1
                      AND (
                          d.UnderOrgID = @SansthaOrgID
                          OR d.OrgID = @SansthaOrgID
                          OR EXISTS (
                              SELECT 1
                              FROM dbo.OrgMaster school
                              WHERE school.OrgID = d.OrgID
                                AND school.UnderOrgID = @SansthaOrgID
                                AND ISNULL(school.IsActive, 1) = 1
                          )
                      )
                  )
                  OR d.OrgID = @UserOrgID
              )
        ) THEN 1
        ELSE 0
    END AS BIT) AS CanAccess;
END
GO

PRINT '118_DocumentUpload_Dashboard applied.';
GO
