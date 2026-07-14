-- 14 July 2026 — Live DB hotfix: complete UserRole rename + procedures for actual SmartERP schema.
-- Live schema: OrgMaster.IsActive (not Status), no SchoolCode/ShortName on OrgMaster, UserMaster.UserRoleID/DesignationID/GenderID.
USE SmartERP;
GO

/* ---- 1. Sync UserRoleMaster from legacy UserTypeMaster, then drop legacy table ---- */
IF OBJECT_ID('dbo.UserTypeMaster', 'U') IS NOT NULL
   AND OBJECT_ID('dbo.UserRoleMaster', 'U') IS NOT NULL
BEGIN
    UPDATE ur
    SET ur.UserRoleName = ut.UserTypeName
    FROM dbo.UserRoleMaster ur
    INNER JOIN dbo.UserTypeMaster ut ON ut.UserTypeID = ur.UserRoleID
    WHERE ut.UserTypeName IS NOT NULL
      AND LTRIM(RTRIM(ut.UserTypeName)) <> N'';

    INSERT INTO dbo.UserRoleMaster (UserRoleID, UserRoleName, IsActive)
    SELECT ut.UserTypeID, ut.UserTypeName, ISNULL(ut.IsActive, 1)
    FROM dbo.UserTypeMaster ut
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.UserRoleMaster ur WHERE ur.UserRoleID = ut.UserTypeID
    );

    DROP TABLE dbo.UserTypeMaster;
END
GO

/* ---- 2. Org list for login (sanstha roles 1,2 vs school role 3+) ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetUserOrgs
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AppUserName VARCHAR(50);
    DECLARE @UserRoleID INT;
    DECLARE @UserOrgID BIGINT;

    SELECT
        @AppUserName = um.AppUserName,
        @UserOrgID = um.OrgID,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    IF @AppUserName IS NULL
        RETURN;

    SELECT TOP 1
        @UserRoleID = v.UserRoleID
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    WHERE v.AppUserName = @AppUserName
    ORDER BY v.OrgID;

    IF @UserRoleID IN (1, 2)
    BEGIN
        SELECT
            x.OrgID,
            x.OrganizationName,
            CAST(NULL AS NVARCHAR(100)) AS ShortName,
            CAST(NULL AS BIGINT) AS SchoolCode
        FROM (
            SELECT DISTINCT
                san.OrgID,
                san.OrganizationName,
                0 AS SortOrder
            FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
            INNER JOIN dbo.OrgMaster san
                ON san.OrgID = v.OrgGroupID
               AND ISNULL(san.IsActive, 1) = 1
               AND san.OrgID = san.UnderOrgID
            WHERE v.AppUserName = @AppUserName

            UNION ALL

            SELECT DISTINCT
                sch.OrgID,
                sch.OrganizationName,
                1 AS SortOrder
            FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
            INNER JOIN dbo.OrgMaster sch
                ON sch.UnderOrgID = v.OrgGroupID
               AND ISNULL(sch.IsActive, 1) = 1
               AND sch.OrgID <> sch.UnderOrgID
            WHERE v.AppUserName = @AppUserName
        ) x
        ORDER BY x.SortOrder, x.OrganizationName;
        RETURN;
    END

    SELECT DISTINCT
        sch.OrgID,
        sch.OrganizationName,
        CAST(NULL AS NVARCHAR(100)) AS ShortName,
        CAST(NULL AS BIGINT) AS SchoolCode
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    INNER JOIN dbo.OrgMaster sch
        ON sch.OrgID = v.OrgID
       AND ISNULL(sch.IsActive, 1) = 1
       AND sch.OrgID <> sch.UnderOrgID
    WHERE v.AppUserName = @AppUserName
    ORDER BY sch.OrganizationName;

    IF @@ROWCOUNT > 0
        RETURN;

    SELECT DISTINCT
        om.OrgID,
        om.OrganizationName,
        CAST(NULL AS NVARCHAR(100)) AS ShortName,
        CAST(NULL AS BIGINT) AS SchoolCode
    FROM dbo.OrgMaster om
    WHERE ISNULL(om.IsActive, 1) = 1
      AND om.OrgID <> om.UnderOrgID
      AND om.OrgID = @UserOrgID
    ORDER BY om.OrganizationName;
END
GO

/* ---- 3. User profile ---- */
CREATE OR ALTER PROCEDURE dbo.sp_UserMaster_GetProfileByUserId
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        um.UserID,
        um.AppUserName,
        um.Firstname,
        um.MiddleName,
        um.LastName,
        um.EmailID,
        um.MobileNo1,
        um.MobileNo2,
        CAST(NULL AS BIGINT) AS SchoolCode,
        um.OrgID,
        um.DesignationID AS DesignationCode,
        um.UserRoleID,
        um.GenderID AS GenderCode,
        um.Dob,
        um.PanNo,
        um.ShalarthID,
        um.IsActive,
        san.OrganizationName AS SansthaName,
        om.OrganizationName AS SchoolName,
        dm.DesignationName
    FROM dbo.UserMaster um
    LEFT JOIN dbo.OrgMaster om ON um.OrgID = om.OrgID
    LEFT JOIN dbo.OrgMaster san ON om.UnderOrgID = san.OrgID
    LEFT JOIN dbo.DesignationMaster dm ON um.DesignationID = dm.DesignationID
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;
END
GO

/* ---- 4. Ticket user context ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Ticket_GetUserContext
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @SansthaOrgID BIGINT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @CanRaiseTicket BIT = 0;

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
        OR EXISTS (
            SELECT 1
            FROM dbo.OrgMaster sch
            WHERE sch.OrgID = @UserOrgID
              AND sch.UnderOrgID = @SansthaOrgID
              AND ISNULL(sch.IsActive, 1) = 1
        )
    )
        SET @IsSansthaUser = 1;

    IF @UserRoleID IN (1, 2)
        SET @CanRaiseTicket = 1;

    SELECT
        @IsSansthaUser AS IsSansthaUser,
        @CanRaiseTicket AS CanRaiseTicket,
        @UserID AS UserID;
END
GO

/* ---- 5. Ticket pending notifications ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Ticket_GetPendingNotifications
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @CanRaiseTicket BIT = 0;
    DECLARE @UserRoleID INT;

    SELECT
        @UserOrgID = um.OrgID,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    IF @UserRoleID IN (1, 2)
        SET @CanRaiseTicket = 1;

    SELECT
        te.TicketID,
        te.TicketNo,
        te.Subject,
        te.Description,
        te.Module,
        te.Priority,
        te.ReplyRequired,
        te.TicketStatusID,
        te.UserID AS CreatedByUserID,
        te.SubmittedDate,
        te.SentDate,
        ts.StatusName,
        ts.StatusNameMr,
        schools.SchoolNames
    FROM dbo.TicketEntry te
    INNER JOIN dbo.TicketStatusMaster ts ON ts.TicketStatusID = te.TicketStatusID
    OUTER APPLY (
        SELECT STRING_AGG(sch.OrganizationName, N', ') WITHIN GROUP (ORDER BY sch.OrganizationName) AS SchoolNames
        FROM dbo.TicketEntryOrg teo
        INNER JOIN dbo.OrgMaster sch ON sch.OrgID = teo.OrgID
        WHERE teo.TicketID = te.TicketID
    ) schools
    WHERE te.IsActive = 1
      AND ts.StatusName <> N'Closed'
      AND te.UserID <> @UserID
      AND @CanRaiseTicket = 0
      AND te.ReplyRequired IS NOT NULL
      AND EXISTS (
          SELECT 1
          FROM dbo.TicketEntryOrg teo
          WHERE teo.TicketID = te.TicketID
            AND teo.OrgID = @UserOrgID
      )
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.TicketReply tr
          WHERE tr.TicketID = te.TicketID
            AND tr.UserID = @UserID
            AND tr.IsActive = 1
      )
    ORDER BY te.SubmittedDate DESC, te.TicketID DESC;
END
GO

/* ---- 6. Ticket acknowledge ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Ticket_Acknowledge
    @TicketID BIGINT,
    @UserID BIGINT,
    @IP NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @CanRaiseTicket BIT = 0;
    DECLARE @UserRoleID INT;
    DECLARE @CreatorUserID BIGINT;
    DECLARE @CurrentStatusName NVARCHAR(100);

    SELECT
        @UserOrgID = um.OrgID,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    IF @UserRoleID IN (1, 2)
        SET @CanRaiseTicket = 1;

    IF @CanRaiseTicket = 1
        THROW 50008, N'Only school users can acknowledge ticket notifications.', 1;

    SELECT
        @CreatorUserID = te.UserID,
        @CurrentStatusName = ts.StatusName
    FROM dbo.TicketEntry te
    INNER JOIN dbo.TicketStatusMaster ts ON ts.TicketStatusID = te.TicketStatusID
    WHERE te.TicketID = @TicketID
      AND te.IsActive = 1;

    IF @CreatorUserID IS NULL
        THROW 50004, N'Ticket not found.', 1;

    IF @CurrentStatusName = N'Closed'
        THROW 50005, N'Ticket is already closed.', 1;

    IF @CreatorUserID = @UserID
        THROW 50009, N'Ticket creator cannot acknowledge own ticket.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.TicketEntryOrg teo
        WHERE teo.TicketID = @TicketID
          AND teo.OrgID = @UserOrgID
    )
        THROW 50010, N'Ticket is not assigned to your school.', 1;

    BEGIN TRANSACTION;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.TicketReply tr
        WHERE tr.TicketID = @TicketID
          AND tr.UserID = @UserID
          AND tr.IsActive = 1
    )
    BEGIN
        INSERT INTO dbo.TicketReply (
            TicketID,
            ReplyText,
            ReplyStatus,
            UserID,
            ReplyDate,
            Attachment,
            IP,
            IsActive
        )
        VALUES (
            @TicketID,
            N'मी वरील सर्व माहिती वाचली आहे.',
            N'Acknowledged',
            @UserID,
            GETDATE(),
            NULL,
            @IP,
            1
        );
    END

    UPDATE te
    SET te.ReadDate = GETDATE(),
        te.ModifyDate = GETDATE()
    FROM dbo.TicketEntry te
    WHERE te.TicketID = @TicketID
      AND te.IsActive = 1
      AND te.ReadDate IS NULL;

    COMMIT TRANSACTION;
END
GO

/* ---- 7. Event user context (repair truncated proc on live) ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Event_GetUserContext
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserRoleID INT;

    SELECT @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT
        CASE WHEN @UserRoleID IN (1, 2, 3) THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS CanManageEvents,
        @UserRoleID AS UserRoleID;
END
GO

PRINT 'Live UserRole + procedures hotfix applied (039).';
GO
