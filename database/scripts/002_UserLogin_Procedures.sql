-- Required stored procedures for SmartEPR login (dbo.UserLogin table).
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_UserLogin_Validate
    @UserName NVARCHAR(256),
    @Password NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ul.TID,
        ul.UserID,
        ul.UserName,
        ul.PasswordHash,
        ul.LastLogin,
        ul.Status
    FROM dbo.UserLogin ul
    WHERE ul.UserName = @UserName
      AND ul.PasswordHash = @Password
      AND ul.Status = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_UserLogin_GetByUserId
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ul.TID,
        ul.UserID,
        ul.UserName,
        ul.PasswordHash,
        ul.LastLogin,
        ul.Status
    FROM dbo.UserLogin ul
    WHERE ul.UserID = @UserID
      AND ul.Status = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_UserLogin_UpdateLastLogin
    @TID INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.UserLogin
    SET LastLogin = SYSUTCDATETIME()
    WHERE TID = @TID
      AND Status = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Health_Ping
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 1 AS PingResult;
END
GO
