-- Dashboard notices: ascending by event date (oldest first)
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_GetRecentNotices
    @UserID BIGINT,
    @TopCount INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    IF @TopCount IS NULL OR @TopCount < 1 SET @TopCount = 10;
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
    ORDER BY e.EventDate ASC, e.EventId ASC;
END
GO

PRINT '090_Dashboard_Notices_Ascending applied.';
GO
