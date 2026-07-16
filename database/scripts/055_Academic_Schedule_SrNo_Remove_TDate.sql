-- Academic Schedule: remove TDate, add SrNo (per Month+Week), fix lookups IsActive, sort classes by ClassID
USE SmartERP;
GO

IF COL_LENGTH('dbo.AcademicSchedule', 'SrNo') IS NULL
    ALTER TABLE dbo.AcademicSchedule ADD SrNo INT NULL;
GO

IF COL_LENGTH('dbo.AcademicSchedule', 'TDate') IS NOT NULL
BEGIN
    ;WITH ranked AS (
        SELECT
            a.ASID,
            ROW_NUMBER() OVER (
                PARTITION BY a.UnderOrgID, a.TMonth, a.WeekID, ISNULL(a.AyID, 0)
                ORDER BY a.ASID
            ) AS NewSrNo
        FROM dbo.AcademicSchedule a
    )
    UPDATE a
    SET a.SrNo = r.NewSrNo
    FROM dbo.AcademicSchedule a
    INNER JOIN ranked r ON r.ASID = a.ASID
    WHERE a.SrNo IS NULL;

    ALTER TABLE dbo.AcademicSchedule DROP COLUMN TDate;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AcademicSchedule_GetLookups
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        san.OrgID,
        san.OrganizationName,
        CAST(NULL AS NVARCHAR(100)) AS ShortName,
        CAST(NULL AS BIGINT) AS SchoolCode,
        san.UnderOrgID
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    INNER JOIN dbo.OrgMaster san
        ON san.OrgID = v.OrgGroupID
       AND ISNULL(san.IsActive, 1) = 1
       AND san.OrgID = san.UnderOrgID
    WHERE v.AppUserName = (
        SELECT um.AppUserName
        FROM dbo.UserMaster um
        WHERE um.UserID = @UserID
          AND um.IsActive = 1
    )
    ORDER BY san.OrganizationName, san.OrgID;

    SELECT
        c.ClassID,
        c.ClassName
    FROM dbo.ClassMaster c
    WHERE ISNULL(c.IsActive, 1) = 1
    ORDER BY c.ClassID, c.ClassName;

    SELECT
        s.SubjectID,
        s.SubjectName
    FROM dbo.SubjectMaster s
    WHERE ISNULL(s.IsActive, 1) = 1
    ORDER BY s.SubjectName, s.SubjectID;

    SELECT
        w.WeekID,
        w.WeekName
    FROM dbo.WeekMaster w
    WHERE ISNULL(w.IsActive, 1) = 1
    ORDER BY w.WeekID;

    SELECT
        ay.AyID,
        ay.AyName,
        ay.FromDate,
        ay.ToDate
    FROM dbo.AyMaster ay
    WHERE ISNULL(ay.IsActive, 1) = 1
    ORDER BY ay.FromDate DESC, ay.AyID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AcademicSchedule_GetList
    @UnderOrgID BIGINT = NULL,
    @ClassID BIGINT = NULL,
    @SubjectID BIGINT = NULL,
    @TMonth INT = NULL,
    @WeekID BIGINT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @AyID BIGINT = NULL,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        a.ASID,
        a.UnderOrgID,
        a.TMonth,
        a.ClassID,
        a.SubjectID,
        a.SrNo,
        a.Title,
        a.Description,
        a.WeekID,
        a.FileAttachment,
        a.AyID,
        om.OrganizationName,
        c.ClassName,
        s.SubjectName,
        w.WeekName,
        ay.AyName
    FROM dbo.AcademicSchedule a
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = a.UnderOrgID
    LEFT JOIN dbo.ClassMaster c ON c.ClassID = a.ClassID
    LEFT JOIN dbo.SubjectMaster s ON s.SubjectID = a.SubjectID
    LEFT JOIN dbo.WeekMaster w ON w.WeekID = a.WeekID
    LEFT JOIN dbo.AyMaster ay ON ay.AyID = a.AyID
    WHERE a.ASID IS NOT NULL
      AND (@UnderOrgID IS NULL OR a.UnderOrgID = @UnderOrgID)
      AND (@ClassID IS NULL OR a.ClassID = @ClassID)
      AND (@SubjectID IS NULL OR a.SubjectID = @SubjectID)
      AND (@TMonth IS NULL OR a.TMonth = @TMonth)
      AND (@WeekID IS NULL OR a.WeekID = @WeekID)
      AND (@AyID IS NULL OR a.AyID = @AyID)
      AND (
          @Search IS NULL
          OR a.Title LIKE N'%' + @Search + N'%'
          OR a.Description LIKE N'%' + @Search + N'%'
      )
    ORDER BY a.TMonth, a.WeekID, a.SrNo, a.ASID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AcademicSchedule_GetById
    @ASID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        a.ASID,
        a.UnderOrgID,
        a.TMonth,
        a.ClassID,
        a.SubjectID,
        a.SrNo,
        a.Title,
        a.Description,
        a.WeekID,
        a.FileAttachment,
        a.AyID,
        om.OrganizationName,
        c.ClassName,
        s.SubjectName,
        w.WeekName,
        ay.AyName
    FROM dbo.AcademicSchedule a
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = a.UnderOrgID
    LEFT JOIN dbo.ClassMaster c ON c.ClassID = a.ClassID
    LEFT JOIN dbo.SubjectMaster s ON s.SubjectID = a.SubjectID
    LEFT JOIN dbo.WeekMaster w ON w.WeekID = a.WeekID
    LEFT JOIN dbo.AyMaster ay ON ay.AyID = a.AyID
    WHERE a.ASID = @ASID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AcademicSchedule_Save
    @ASID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @TMonth INT,
    @ClassID BIGINT,
    @SubjectID BIGINT,
    @Title NVARCHAR(500),
    @Description NVARCHAR(MAX) = NULL,
    @WeekID BIGINT,
    @FileAttachment NVARCHAR(500) = NULL,
    @AyID BIGINT = NULL,
    @SrNo INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
    BEGIN
        RAISERROR('Under organization is required.', 16, 1);
        RETURN;
    END

    IF @TMonth IS NULL OR @TMonth < 1 OR @TMonth > 12
    BEGIN
        RAISERROR('Month is required.', 16, 1);
        RETURN;
    END

    IF @ClassID IS NULL OR @ClassID <= 0
    BEGIN
        RAISERROR('Class is required.', 16, 1);
        RETURN;
    END

    IF @SubjectID IS NULL OR @SubjectID <= 0
    BEGIN
        RAISERROR('Subject is required.', 16, 1);
        RETURN;
    END

    IF @WeekID IS NULL OR @WeekID <= 0
    BEGIN
        RAISERROR('Week is required.', 16, 1);
        RETURN;
    END

    SET @Title = LTRIM(RTRIM(ISNULL(@Title, N'')));
    IF @Title = N''
    BEGIN
        RAISERROR('Title is required.', 16, 1);
        RETURN;
    END

    IF @AyID IS NULL OR @AyID = 0
    BEGIN
        SELECT TOP 1 @AyID = ay.AyID
        FROM dbo.AyMaster ay
        WHERE ISNULL(ay.IsActive, 1) = 1
          AND CAST(GETDATE() AS DATE) >= CAST(ay.FromDate AS DATE)
          AND CAST(GETDATE() AS DATE) <= CAST(ay.ToDate AS DATE)
        ORDER BY ay.FromDate DESC, ay.AyID DESC;

        IF @AyID IS NULL
        BEGIN
            SELECT TOP 1 @AyID = ay.AyID
            FROM dbo.AyMaster ay
            WHERE ISNULL(ay.IsActive, 1) = 1
            ORDER BY ay.FromDate DESC, ay.AyID DESC;
        END
    END

    IF @ASID IS NULL OR @ASID = 0
    BEGIN
        IF @SrNo IS NULL OR @SrNo <= 0
        BEGIN
            SELECT @SrNo = ISNULL(MAX(a.SrNo), 0) + 1
            FROM dbo.AcademicSchedule a
            WHERE a.UnderOrgID = @UnderOrgID
              AND a.TMonth = @TMonth
              AND a.WeekID = @WeekID
              AND ISNULL(a.AyID, 0) = ISNULL(@AyID, 0);
        END

        INSERT INTO dbo.AcademicSchedule (
            UnderOrgID,
            TMonth,
            ClassID,
            SubjectID,
            SrNo,
            Title,
            Description,
            WeekID,
            FileAttachment,
            AyID
        )
        VALUES (
            @UnderOrgID,
            @TMonth,
            @ClassID,
            @SubjectID,
            @SrNo,
            @Title,
            @Description,
            @WeekID,
            @FileAttachment,
            @AyID
        );

        SET @ASID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.AcademicSchedule
        SET UnderOrgID = @UnderOrgID,
            TMonth = @TMonth,
            ClassID = @ClassID,
            SubjectID = @SubjectID,
            SrNo = CASE WHEN @SrNo IS NOT NULL AND @SrNo > 0 THEN @SrNo ELSE SrNo END,
            Title = @Title,
            Description = @Description,
            WeekID = @WeekID,
            FileAttachment = CASE WHEN @FileAttachment IS NOT NULL THEN @FileAttachment ELSE FileAttachment END,
            AyID = @AyID
        WHERE ASID = @ASID;
    END
END
GO

PRINT 'Academic Schedule SrNo / TDate migration applied.';
GO
