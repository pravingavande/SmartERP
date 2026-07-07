-- Login stored procedures for dbo.UserMaster (AppUserName / AppPassword).
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_UserMaster_ValidateLogin
    @AppUserName VARCHAR(50),
    @AppPassword VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        um.UserID,
        um.AppUserName,
        um.AppPassword,
        um.Firstname,
        um.MiddleName,
        um.LastName,
        um.EmailID,
        um.IsActive
    FROM dbo.UserMaster um
    WHERE um.AppUserName = @AppUserName
      AND um.AppPassword = @AppPassword
      AND um.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_UserMaster_GetByUserId
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        um.UserID,
        um.AppUserName,
        um.AppPassword,
        um.Firstname,
        um.MiddleName,
        um.LastName,
        um.EmailID,
        um.IsActive
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;
END
GO
