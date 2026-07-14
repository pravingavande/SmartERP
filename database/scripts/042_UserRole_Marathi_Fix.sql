-- Fix UserRoleMaster Marathi display: column was VARCHAR (stores ? for Unicode).
-- Run: sqlcmd -S ... -d SmartERP -U ... -P ... -C -f 65001 -i 042_UserRole_Marathi_Fix.sql

USE SmartERP;
GO

IF COL_LENGTH('dbo.UserRoleMaster', 'UserRoleName') IS NOT NULL
BEGIN
    ALTER TABLE dbo.UserRoleMaster
    ALTER COLUMN UserRoleName NVARCHAR(100) NOT NULL;
END
GO

UPDATE dbo.UserRoleMaster
SET UserRoleName = N'संस्था प्रशासक'
WHERE UserRoleID = 1;

UPDATE dbo.UserRoleMaster
SET UserRoleName = N'संस्था'
WHERE UserRoleID = 2;

UPDATE dbo.UserRoleMaster
SET UserRoleName = N'शाला: संस्था 20 वर्षे'
WHERE UserRoleID = 3;

UPDATE dbo.UserRoleMaster
SET UserRoleName = N'शाला: संस्था 40 वर्षे'
WHERE UserRoleID = 4;
GO

PRINT N'UserRoleMaster Marathi names updated.';
GO
