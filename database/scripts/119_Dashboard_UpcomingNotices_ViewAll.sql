-- Dashboard notices: optional upcoming-only filter; higher top count for view-all page
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_GetRecentNotices
    @UserID BIGINT,
    @TopCount INT = 10,
    @UpcomingOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF @TopCount IS NULL OR @TopCount < 1 SET @TopCount = 10;
    IF @TopCount > 500 SET @TopCount = 500;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @SansthaOrgID BIGINT;
    DECLARE @Today DATE = CAST(GETDATE() AS DATE);

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
        e.EventId AS EventID,
        e.EventDate,
        e.CreatedAt,
        e.Title,
        e.EventPhotoAttachment,
        e.EventNewsAttachment,
        CASE
            WHEN e.CreatedAt >= DATEADD(DAY, -7, SYSUTCDATETIME()) THEN 1
            ELSE 0
        END AS IsNew
    FROM dbo.Events e
    WHERE (
        @IsSansthaUser = 1
        OR EXISTS (
            SELECT 1
            FROM dbo.EventOrg eo
            WHERE eo.EventID = e.EventId
              AND eo.OrgID = @UserOrgID
        )
        OR e.OrgID = @UserOrgID
    )
      AND (
          @UpcomingOnly = 0
          OR CAST(e.EventDate AS DATE) >= @Today
      )
    ORDER BY e.EventDate ASC, e.EventId ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DocumentUpload_GetDashboardDocuments
    @UserID BIGINT,
    @TopCount INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF @TopCount IS NULL OR @TopCount < 1 SET @TopCount = 20;
    IF @TopCount > 500 SET @TopCount = 500;

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

PRINT '119_Dashboard_UpcomingNotices_ViewAll applied.';
GO
