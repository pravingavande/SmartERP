-- Fix AcademicSchedule.TMonth: must be INT (API/Dapper expects int; live had datetime after bad migration)
USE SmartERP;
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID('dbo.AcademicSchedule')
      AND c.name = 'TMonth'
      AND t.name IN ('datetime', 'datetime2', 'date')
)
BEGIN
    ALTER TABLE dbo.AcademicSchedule ADD TMonth_Int INT NULL;

    UPDATE dbo.AcademicSchedule
    SET TMonth_Int = CASE
        WHEN TMonth IS NULL THEN NULL
        WHEN CAST(TMonth AS DATE) >= '1900-01-01' AND CAST(TMonth AS DATE) < '1900-02-01'
            THEN DAY(CAST(TMonth AS DATE))
        ELSE MONTH(CAST(TMonth AS DATE))
    END;

    UPDATE dbo.AcademicSchedule SET TMonth_Int = 1 WHERE TMonth_Int IS NULL OR TMonth_Int < 1 OR TMonth_Int > 12;

    ALTER TABLE dbo.AcademicSchedule DROP COLUMN TMonth;
    EXEC sp_rename 'dbo.AcademicSchedule.TMonth_Int', 'TMonth', 'COLUMN';

    ALTER TABLE dbo.AcademicSchedule ALTER COLUMN TMonth INT NOT NULL;
END
GO

PRINT 'AcademicSchedule.TMonth converted to INT.';
GO
