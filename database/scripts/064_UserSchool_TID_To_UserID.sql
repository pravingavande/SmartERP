-- ============================================================
-- Step 1: UserSchool – rename TID → UserID
-- - Ensure UserSchoolID is PK (identity)
-- - Rename TID column to UserID when still present
-- - Align Employee/Teacher SPs that touch UserSchool
-- ============================================================
SET NOCOUNT ON;
GO

/* ---------- Schema: TID → UserID (idempotent) ---------- */
IF COL_LENGTH('dbo.UserSchool', 'TID') IS NOT NULL
   AND COL_LENGTH('dbo.UserSchool', 'UserID') IS NULL
BEGIN
    EXEC sp_rename 'dbo.UserSchool.TID', 'UserID', 'COLUMN';
    PRINT 'Renamed dbo.UserSchool.TID → UserID';
END
ELSE IF COL_LENGTH('dbo.UserSchool', 'UserID') IS NOT NULL
    PRINT 'dbo.UserSchool.UserID already exists';
ELSE
    PRINT 'WARN: dbo.UserSchool has neither TID nor UserID';
GO

/* Ensure UserSchoolID identity column exists */
IF COL_LENGTH('dbo.UserSchool', 'UserSchoolID') IS NULL
BEGIN
    ALTER TABLE dbo.UserSchool ADD UserSchoolID BIGINT IDENTITY(1,1) NOT NULL;
    PRINT 'Added dbo.UserSchool.UserSchoolID';
END
GO

/* Ensure PK on UserSchoolID */
IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints kc
    WHERE kc.parent_object_id = OBJECT_ID('dbo.UserSchool')
      AND kc.type = 'PK'
)
BEGIN
    ALTER TABLE dbo.UserSchool
    ADD CONSTRAINT PK_UserSchool PRIMARY KEY CLUSTERED (UserSchoolID);
    PRINT 'Created PK_UserSchool on UserSchoolID';
END
ELSE
BEGIN
    DECLARE @pkCol SYSNAME =
    (
        SELECT c.name
        FROM sys.key_constraints kc
        INNER JOIN sys.index_columns ic
            ON ic.object_id = kc.parent_object_id
           AND ic.index_id = kc.unique_index_id
        INNER JOIN sys.columns c
            ON c.object_id = ic.object_id
           AND c.column_id = ic.column_id
        WHERE kc.parent_object_id = OBJECT_ID('dbo.UserSchool')
          AND kc.type = 'PK'
          AND ic.key_ordinal = 1
    );

    IF @pkCol = 'UserSchoolID'
        PRINT 'PK_UserSchool already on UserSchoolID';
    ELSE
        PRINT 'WARN: Existing PK is on [' + ISNULL(@pkCol, '?') + '], not UserSchoolID. Review manually.';
END
GO

/* Helpful non-unique index for lookups by user */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_UserSchool_UserID'
      AND object_id = OBJECT_ID('dbo.UserSchool')
)
AND COL_LENGTH('dbo.UserSchool', 'UserID') IS NOT NULL
BEGIN
    CREATE NONCLUSTERED INDEX IX_UserSchool_UserID
        ON dbo.UserSchool (UserID)
        INCLUDE (SrNo, OrgID, DesignationID);
    PRINT 'Created IX_UserSchool_UserID';
END
GO

/* ---------- Get schools by user ---------- */
CREATE OR ALTER PROCEDURE dbo.sp_Employee_School_GetByUserId
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        us.UserSchoolID,
        us.UserID,
        us.SrNo,
        us.OrgID,
        CAST(NULL AS BIGINT) AS SchoolCode,
        us.DesignationID AS DesignationCode,
        us.TeachClass,
        us.TeachSubject,
        us.SchoolJoiningDate,
        us.SchoolLeaveDate,
        CAST(NULL AS NVARCHAR(255)) AS SansthaTransferOrderNoAndDate,
        CAST(NULL AS NVARCHAR(255)) AS ZPTransferOrderNoAndDate
    FROM dbo.UserSchool us
    WHERE us.UserID = @UserID
    ORDER BY us.SrNo, us.UserSchoolID;
END
GO

/* ---------- Patch Save procs: replace UserSchool.TID → UserID ---------- */
DECLARE @procs TABLE (ProcName SYSNAME);
INSERT INTO @procs (ProcName)
VALUES (N'sp_Employee_Save'), (N'sp_Teacher_Save');

DECLARE @name SYSNAME;
DECLARE @def NVARCHAR(MAX);
DECLARE @sql NVARCHAR(MAX);

DECLARE proc_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT ProcName FROM @procs;

OPEN proc_cursor;
FETCH NEXT FROM proc_cursor INTO @name;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @def = OBJECT_DEFINITION(OBJECT_ID(N'dbo.' + @name));
    IF @def IS NULL
    BEGIN
        PRINT 'SKIP: dbo.' + @name + ' not found';
        FETCH NEXT FROM proc_cursor INTO @name;
        CONTINUE;
    END

    IF @def NOT LIKE '%UserSchool%'
    BEGIN
        PRINT 'SKIP: dbo.' + @name + ' has no UserSchool references';
        FETCH NEXT FROM proc_cursor INTO @name;
        CONTINUE;
    END

    IF @def NOT LIKE '%UserSchool%TID%'
       AND @def NOT LIKE '%WHERE TID = @UserID%'
       AND CHARINDEX('TID, SrNo', @def) = 0
    BEGIN
        PRINT 'OK: dbo.' + @name + ' already uses UserID for UserSchool';
        FETCH NEXT FROM proc_cursor INTO @name;
        CONTINUE;
    END

    SET @sql = @def;
    SET @sql = REPLACE(@sql, N'CREATE PROCEDURE', N'CREATE OR ALTER PROCEDURE');
    SET @sql = REPLACE(@sql, N'CREATE  PROCEDURE', N'CREATE OR ALTER PROCEDURE');
    SET @sql = REPLACE(@sql, N'CREATE   PROCEDURE', N'CREATE OR ALTER PROCEDURE');
    SET @sql = REPLACE(@sql, N'CREATE PROC ', N'CREATE OR ALTER PROC ');

    -- UserSchool FK column rename in DELETE / INSERT lists
    SET @sql = REPLACE(@sql, N'DELETE FROM dbo.UserSchool WHERE TID = @UserID', N'DELETE FROM dbo.UserSchool WHERE UserID = @UserID');
    SET @sql = REPLACE(@sql, N'DELETE FROM UserSchool WHERE TID = @UserID', N'DELETE FROM dbo.UserSchool WHERE UserID = @UserID');
    SET @sql = REPLACE(@sql, N'INSERT INTO dbo.UserSchool (
            TID,', N'INSERT INTO dbo.UserSchool (
            UserID,');
    SET @sql = REPLACE(@sql, N'INSERT INTO dbo.UserSchool (
            TID, SrNo', N'INSERT INTO dbo.UserSchool (
            UserID, SrNo');
    SET @sql = REPLACE(@sql, N'TID, SrNo, OrgID, DesignationID', N'UserID, SrNo, OrgID, DesignationID');
    SET @sql = REPLACE(@sql, N'TID, SrNo, OrgID, SchoolCode, DesignationCode', N'UserID, SrNo, OrgID, SchoolCode, DesignationCode');
    SET @sql = REPLACE(@sql, N'TID, SrNo, OrgID, DesignationID, TeachClass, TeachSubject', N'UserID, SrNo, OrgID, DesignationID, TeachClass, TeachSubject');

    -- Live UserMaster may not have CreatedAt; strip insert pairs so CREATE OR ALTER succeeds.
    SET @sql = REPLACE(@sql, N',
            CreatedAt', N'');
    SET @sql = REPLACE(@sql, N',
            GETDATE()', N'');

    BEGIN TRY
        EXEC sys.sp_executesql @sql;
        PRINT 'Patched dbo.' + @name + ' (UserSchool.TID → UserID)';
    END TRY
    BEGIN CATCH
        PRINT 'ERROR patching dbo.' + @name + ': ' + ERROR_MESSAGE();
    END CATCH

    FETCH NEXT FROM proc_cursor INTO @name;
END

CLOSE proc_cursor;
DEALLOCATE proc_cursor;
GO

/* ---------- Verify ---------- */
PRINT '--- UserSchool columns ---';
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'UserSchool'
ORDER BY ORDINAL_POSITION;

PRINT '--- PK ---';
SELECT kc.name AS PkName, c.name AS ColumnName
FROM sys.key_constraints kc
INNER JOIN sys.index_columns ic
    ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
INNER JOIN sys.columns c
    ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE kc.parent_object_id = OBJECT_ID('dbo.UserSchool') AND kc.type = 'PK'
ORDER BY ic.key_ordinal;

PRINT '--- Smoke: GetByUserId ---';
EXEC dbo.sp_Employee_School_GetByUserId @UserID = 3;
GO

PRINT '064_UserSchool_TID_To_UserID applied.';
GO
