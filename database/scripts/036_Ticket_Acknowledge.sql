-- Ticket acknowledgment (read notice) for school users — sets ReadDate and per-user acknowledgment reply.
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_Acknowledge
    @TicketID BIGINT,
    @UserID BIGINT,
    @IP NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @CanRaiseTicket BIT = 0;
    DECLARE @UserRoleID INT;
    DECLARE @CreatorUserID BIGINT;
    DECLARE @CurrentStatusName NVARCHAR(100);

    SELECT
        @UserOrgID = um.OrgID,
        @UserSchoolCode = um.SchoolCode,
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
        INNER JOIN dbo.OrgMaster sch ON sch.OrgID = teo.OrgID
        WHERE teo.TicketID = @TicketID
          AND (
              teo.OrgID = @UserOrgID
              OR sch.SchoolCode = @UserSchoolCode
          )
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
