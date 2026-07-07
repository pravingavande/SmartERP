-- SmartEPR initial schema and stored procedures
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.Users
    (
        UserId       INT            IDENTITY(1,1) NOT NULL,
        UserName     NVARCHAR(100)  NOT NULL,
        PasswordHash NVARCHAR(128)  NOT NULL,
        DisplayName  NVARCHAR(200)  NOT NULL,
        Email        NVARCHAR(256)  NOT NULL,
        RoleCode     NVARCHAR(50)   NOT NULL CONSTRAINT DF_Users_RoleCode DEFAULT ('USER'),
        IsActive     BIT            NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
        CreatedOn    DATETIME2(0)   NOT NULL CONSTRAINT DF_Users_CreatedOn DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (UserId),
        CONSTRAINT UQ_Users_UserName UNIQUE (UserName)
    );

    CREATE NONCLUSTERED INDEX IX_Users_UserName_IsActive
        ON dbo.Users (UserName, IsActive)
        INCLUDE (UserId, PasswordHash, DisplayName, Email, RoleCode);
END
GO

-- Default admin: username admin / password Admin@123
-- SHA256 hex of Admin@123
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserName = N'admin')
BEGIN
    INSERT INTO dbo.Users (UserName, PasswordHash, DisplayName, Email, RoleCode, IsActive)
    VALUES (
        N'admin',
        N'E86F78A8A3CAF0B60D8E74E5942AA6D86DC150CD3C03338AEF25B7D2D7E3ACC7',
        N'System Administrator',
        N'admin@smartepr.local',
        N'ADMIN',
        1
    );
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_ValidateLogin
    @UserName     NVARCHAR(100),
    @PasswordHash NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.UserId,
        u.UserName,
        u.DisplayName,
        u.Email,
        u.RoleCode,
        u.IsActive
    FROM dbo.Users u
    WHERE u.UserName = @UserName
      AND u.PasswordHash = @PasswordHash
      AND u.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetById
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.UserId,
        u.UserName,
        u.DisplayName,
        u.Email,
        u.RoleCode,
        u.IsActive
    FROM dbo.Users u
    WHERE u.UserId = @UserId
      AND u.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Health_Ping
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 1 AS PingResult;
END
GO
