-- Master save validation guards (required text + trim)
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Class_Save
    @ClassID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @SrNo BIGINT = NULL,
    @ClassName NVARCHAR(200),
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @ClassName = LTRIM(RTRIM(ISNULL(@ClassName, N'')));

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @ClassName = N''
    BEGIN
        RAISERROR('Class name is required.', 16, 1);
        RETURN;
    END

    IF @SrNo IS NULL OR @SrNo <= 0
    BEGIN
        SELECT @SrNo = ISNULL(MAX(c.SrNo), 0) + 1
        FROM dbo.ClassMaster c WITH (UPDLOCK, HOLDLOCK)
        WHERE c.OrgID = @OrgID;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.ClassMaster c
        WHERE c.OrgID = @OrgID
          AND c.SrNo = @SrNo
          AND c.ClassID <> ISNULL(@ClassID, 0)
    )
    BEGIN
        RAISERROR('Sr No already exists for this organization.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.ClassMaster c
        WHERE c.OrgID = @OrgID
          AND c.ClassName = @ClassName
          AND c.ClassID <> ISNULL(@ClassID, 0)
    )
    BEGIN
        RAISERROR('Class name already exists for this organization.', 16, 1);
        RETURN;
    END

    IF @ClassID IS NULL OR @ClassID = 0
    BEGIN
        INSERT INTO dbo.ClassMaster (OrgID, SrNo, ClassName, IsActive)
        VALUES (@OrgID, @SrNo, @ClassName, @IsActive);

        SET @ClassID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.ClassMaster
        SET OrgID = @OrgID,
            SrNo = @SrNo,
            ClassName = @ClassName,
            IsActive = @IsActive
        WHERE ClassID = @ClassID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_Save
    @SubjectID BIGINT = NULL OUTPUT,
    @SubjectName NVARCHAR(200),
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @SubjectName = LTRIM(RTRIM(ISNULL(@SubjectName, N'')));
    IF @SubjectName = N''
    BEGIN
        RAISERROR('Subject name is required.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.SubjectMaster s
        WHERE s.SubjectName = @SubjectName
          AND s.SubjectID <> ISNULL(@SubjectID, 0)
    )
    BEGIN
        RAISERROR('Subject name already exists.', 16, 1);
        RETURN;
    END

    IF @SubjectID IS NULL OR @SubjectID = 0
    BEGIN
        INSERT INTO dbo.SubjectMaster (SubjectName, IsActive)
        VALUES (@SubjectName, @IsActive);

        SET @SubjectID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.SubjectMaster
        SET SubjectName = @SubjectName,
            IsActive = @IsActive
        WHERE SubjectID = @SubjectID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ItemGroup_Save
    @ItemGroupID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @ItemGroupName NVARCHAR(200),
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    SET @ItemGroupName = LTRIM(RTRIM(ISNULL(@ItemGroupName, N'')));
    IF @ItemGroupName = N''
    BEGIN
        RAISERROR('Item group name is required.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.ItemGroupMaster g
        WHERE g.OrgID = @OrgID
          AND g.ItemGroupName = @ItemGroupName
          AND g.ItemGroupID <> ISNULL(@ItemGroupID, 0)
    )
    BEGIN
        RAISERROR('Item group name already exists for this organization.', 16, 1);
        RETURN;
    END

    IF @ItemGroupID IS NULL OR @ItemGroupID = 0
    BEGIN
        DECLARE @SrNo INT;

        SELECT @SrNo = ISNULL(MAX(g.SrNo), 0) + 1
        FROM dbo.ItemGroupMaster g
        WHERE g.OrgID = @OrgID;

        INSERT INTO dbo.ItemGroupMaster (OrgID, SrNo, ItemGroupName, IsActive)
        VALUES (@OrgID, @SrNo, @ItemGroupName, @IsActive);

        SET @ItemGroupID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.ItemGroupMaster
        SET ItemGroupName = @ItemGroupName,
            IsActive = @IsActive
        WHERE ItemGroupID = @ItemGroupID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_Save
    @ItemID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @ItemGroupID BIGINT,
    @ItemName NVARCHAR(200),
    @Rate DECIMAL(18, 2),
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @ItemGroupID IS NULL OR @ItemGroupID <= 0
    BEGIN
        RAISERROR('Item group is required.', 16, 1);
        RETURN;
    END

    SET @ItemName = LTRIM(RTRIM(ISNULL(@ItemName, N'')));
    IF @ItemName = N''
    BEGIN
        RAISERROR('Item name is required.', 16, 1);
        RETURN;
    END

    IF @Rate < 0
    BEGIN
        RAISERROR('Rate must be greater than or equal to zero.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.ItemMaster i
        WHERE i.OrgID = @OrgID
          AND i.ItemName = @ItemName
          AND i.ItemID <> ISNULL(@ItemID, 0)
    )
    BEGIN
        RAISERROR('Item name already exists for this organization.', 16, 1);
        RETURN;
    END

    IF @ItemID IS NULL OR @ItemID = 0
    BEGIN
        INSERT INTO dbo.ItemMaster (OrgID, ItemGroupID, ItemName, Rate, IsActive)
        VALUES (@OrgID, @ItemGroupID, @ItemName, @Rate, @IsActive);

        SET @ItemID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.ItemMaster
        SET OrgID = @OrgID,
            ItemGroupID = @ItemGroupID,
            ItemName = @ItemName,
            Rate = @Rate,
            IsActive = @IsActive
        WHERE ItemID = @ItemID;
    END
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
    @SrNo INT = NULL,
    @TDate DATE = NULL
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

    IF @SrNo IS NULL OR @SrNo <= 0
    BEGIN
        SELECT @SrNo = ISNULL(MAX(a.SrNo), 0) + 1
        FROM dbo.AcademicSchedule a
        WHERE a.UnderOrgID = @UnderOrgID
          AND a.TMonth = @TMonth
          AND a.WeekID = @WeekID
          AND ISNULL(a.AyID, 0) = ISNULL(@AyID, 0);
    END

    IF @TDate IS NULL
        SET @TDate = CAST(GETDATE() AS DATE);

    IF @ASID IS NULL OR @ASID = 0
    BEGIN
        INSERT INTO dbo.AcademicSchedule (
            UnderOrgID,
            TMonth,
            ClassID,
            SubjectID,
            TDate,
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
            @TDate,
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
            TDate = @TDate,
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
