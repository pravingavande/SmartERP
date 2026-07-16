USE SmartERP;
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
    @SrNo INT = NULL,
    @TDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- @TDate retained for older API builds; column removed from table.

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

PRINT 'sp_AcademicSchedule_Save updated (no TDate).';
GO
