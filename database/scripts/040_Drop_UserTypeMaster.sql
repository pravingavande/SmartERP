-- Drop legacy UserTypeMaster after copying missing roles into UserRoleMaster (no IsActive column on live).
USE SmartERP;
GO

IF OBJECT_ID('dbo.UserTypeMaster', 'U') IS NOT NULL
   AND OBJECT_ID('dbo.UserRoleMaster', 'U') IS NOT NULL
BEGIN
    UPDATE ur
    SET ur.UserRoleName = ut.UserTypeName
    FROM dbo.UserRoleMaster ur
    INNER JOIN dbo.UserTypeMaster ut ON ut.UserTypeID = ur.UserRoleID
    WHERE ut.UserTypeName IS NOT NULL
      AND LTRIM(RTRIM(ut.UserTypeName)) <> N'';

    INSERT INTO dbo.UserRoleMaster (UserRoleID, UserRoleName)
    SELECT ut.UserTypeID, ut.UserTypeName
    FROM dbo.UserTypeMaster ut
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.UserRoleMaster ur WHERE ur.UserRoleID = ut.UserTypeID
    );

    DROP TABLE dbo.UserTypeMaster;
    PRINT 'Dropped legacy UserTypeMaster; roles merged into UserRoleMaster.';
END
ELSE
    PRINT 'UserTypeMaster already removed or UserRoleMaster missing.';
GO
