-- Class, Subject, Academic Schedule, Item Group, Item, Stock Register masters
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

/* ========== Class Master ========== */

CREATE OR ALTER PROCEDURE dbo.sp_Class_GetList
    @OrgID BIGINT,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.ClassID,
        c.OrgID,
        c.SrNo,
        c.ClassName,
        c.IsActive,
        om.OrganizationName
    FROM dbo.ClassMaster c
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = c.OrgID
    WHERE c.OrgID = @OrgID
      AND (
          @Search IS NULL
          OR @Search = N''
          OR c.ClassName LIKE N'%' + @Search + N'%'
      )
    ORDER BY c.SrNo, c.ClassName, c.ClassID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Class_GetById
    @ClassID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.ClassID,
        c.OrgID,
        c.SrNo,
        c.ClassName,
        c.IsActive,
        om.OrganizationName
    FROM dbo.ClassMaster c
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = c.OrgID
    WHERE c.ClassID = @ClassID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Class_GetOptions
    @OrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.ClassID,
        c.ClassName
    FROM dbo.ClassMaster c
    WHERE ISNULL(c.IsActive, 1) = 1
      AND (@OrgID IS NULL OR c.OrgID = @OrgID)
    ORDER BY c.SrNo, c.ClassName, c.ClassID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Class_GetNextSrNo
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(c.SrNo), 0) + 1 AS NextSrNo
    FROM dbo.ClassMaster c
    WHERE c.OrgID = @OrgID;
END
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

CREATE OR ALTER PROCEDURE dbo.sp_Class_Delete
    @ClassID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.ClassMaster
    SET IsActive = 0
    WHERE ClassID = @ClassID;
END
GO

/* ========== Subject Master ========== */

CREATE OR ALTER PROCEDURE dbo.sp_Subject_GetList
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.SubjectID,
        s.SubjectName,
        s.IsActive
    FROM dbo.SubjectMaster s
    WHERE s.SubjectID IS NOT NULL
      AND (
          @Search IS NULL
          OR s.SubjectName LIKE N'%' + @Search + N'%'
      )
    ORDER BY s.SubjectName, s.SubjectID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_GetById
    @SubjectID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.SubjectID,
        s.SubjectName,
        s.IsActive
    FROM dbo.SubjectMaster s
    WHERE s.SubjectID = @SubjectID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_GetOptions
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.SubjectID,
        s.SubjectName
    FROM dbo.SubjectMaster s
    WHERE ISNULL(s.IsActive, 1) = 1
    ORDER BY s.SubjectName, s.SubjectID;
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

CREATE OR ALTER PROCEDURE dbo.sp_Subject_Delete
    @SubjectID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.SubjectMaster
    SET IsActive = 0
    WHERE SubjectID = @SubjectID;
END
GO

/* ========== Academic Schedule lookups ========== */

CREATE OR ALTER PROCEDURE dbo.sp_AcademicSchedule_GetLookups
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        san.OrgID,
        san.OrganizationName,
        san.ShortName,
        san.SchoolCode,
        san.UnderOrgID
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    INNER JOIN dbo.OrgMaster san
        ON san.OrgID = v.OrgGroupID
       AND san.Status = 1
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
    ORDER BY c.ClassName, c.ClassID;

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

CREATE OR ALTER PROCEDURE dbo.sp_AcademicSchedule_GetCurrentAyId
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AyID BIGINT;

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

    SELECT ISNULL(@AyID, 0) AS AyID;
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
        a.TDate,
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
      AND (@FromDate IS NULL OR a.TDate >= @FromDate)
      AND (@ToDate IS NULL OR a.TDate <= @ToDate)
      AND (
          @Search IS NULL
          OR a.Title LIKE N'%' + @Search + N'%'
          OR a.Description LIKE N'%' + @Search + N'%'
      )
    ORDER BY a.TDate DESC, a.ASID DESC;
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
        a.TDate,
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
    @TDate DATE,
    @Title NVARCHAR(500),
    @Description NVARCHAR(MAX) = NULL,
    @WeekID BIGINT,
    @FileAttachment NVARCHAR(500) = NULL,
    @AyID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

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
        INSERT INTO dbo.AcademicSchedule (
            UnderOrgID,
            TMonth,
            ClassID,
            SubjectID,
            TDate,
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
            Title = @Title,
            Description = @Description,
            WeekID = @WeekID,
            FileAttachment = CASE WHEN @FileAttachment IS NOT NULL THEN @FileAttachment ELSE FileAttachment END,
            AyID = @AyID
        WHERE ASID = @ASID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AcademicSchedule_Delete
    @ASID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.AcademicSchedule
    WHERE ASID = @ASID;
END
GO

/* ========== Item Group Master ========== */

CREATE OR ALTER PROCEDURE dbo.sp_ItemGroup_GetList
    @OrgID BIGINT,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        g.ItemGroupID,
        g.OrgID,
        g.SrNo,
        g.ItemGroupName,
        g.IsActive,
        om.OrganizationName
    FROM dbo.ItemGroupMaster g
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = g.OrgID
    WHERE g.OrgID = @OrgID
      AND (
          @Search IS NULL
          OR g.ItemGroupName LIKE N'%' + @Search + N'%'
      )
    ORDER BY g.SrNo, g.ItemGroupID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ItemGroup_GetById
    @ItemGroupID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        g.ItemGroupID,
        g.OrgID,
        g.SrNo,
        g.ItemGroupName,
        g.IsActive,
        om.OrganizationName
    FROM dbo.ItemGroupMaster g
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = g.OrgID
    WHERE g.ItemGroupID = @ItemGroupID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ItemGroup_GetOptions
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        g.ItemGroupID,
        g.ItemGroupName,
        g.SrNo
    FROM dbo.ItemGroupMaster g
    WHERE g.OrgID = @OrgID
      AND ISNULL(g.IsActive, 1) = 1
    ORDER BY g.SrNo, g.ItemGroupID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ItemGroup_GetNextSrNo
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(g.SrNo), 0) + 1 AS NextSrNo
    FROM dbo.ItemGroupMaster g
    WHERE g.OrgID = @OrgID;
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

CREATE OR ALTER PROCEDURE dbo.sp_ItemGroup_Delete
    @ItemGroupID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.ItemGroupMaster
    SET IsActive = 0
    WHERE ItemGroupID = @ItemGroupID;
END
GO

/* ========== Item Master ========== */

CREATE OR ALTER PROCEDURE dbo.sp_Item_GetList
    @OrgID BIGINT,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.ItemID,
        i.OrgID,
        i.ItemGroupID,
        i.ItemName,
        i.Rate,
        i.IsActive,
        om.OrganizationName,
        g.ItemGroupName
    FROM dbo.ItemMaster i
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = i.OrgID
    LEFT JOIN dbo.ItemGroupMaster g ON g.ItemGroupID = i.ItemGroupID
    WHERE i.OrgID = @OrgID
      AND (
          @Search IS NULL
          OR i.ItemName LIKE N'%' + @Search + N'%'
          OR g.ItemGroupName LIKE N'%' + @Search + N'%'
      )
    ORDER BY g.SrNo, i.ItemName, i.ItemID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_GetById
    @ItemID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.ItemID,
        i.OrgID,
        i.ItemGroupID,
        i.ItemName,
        i.Rate,
        i.IsActive,
        om.OrganizationName,
        g.ItemGroupName
    FROM dbo.ItemMaster i
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = i.OrgID
    LEFT JOIN dbo.ItemGroupMaster g ON g.ItemGroupID = i.ItemGroupID
    WHERE i.ItemID = @ItemID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_GetOptions
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.ItemID,
        i.ItemName,
        i.Rate,
        i.ItemGroupID
    FROM dbo.ItemMaster i
    WHERE i.OrgID = @OrgID
      AND ISNULL(i.IsActive, 1) = 1
    ORDER BY i.ItemName, i.ItemID;
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

CREATE OR ALTER PROCEDURE dbo.sp_Item_Delete
    @ItemID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.ItemMaster
    SET IsActive = 0
    WHERE ItemID = @ItemID;
END
GO

/* ========== Stock Register ========== */

CREATE OR ALTER PROCEDURE dbo.sp_Stock_GetList
    @OrgID BIGINT,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        st.StockID,
        st.OrgID,
        st.ItemID,
        st.Qty,
        st.Rate,
        st.Amount,
        st.Remark,
        om.OrganizationName,
        i.ItemName
    FROM dbo.StockRegister st
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = st.OrgID
    LEFT JOIN dbo.ItemMaster i ON i.ItemID = st.ItemID
    WHERE st.OrgID = @OrgID
      AND (
          @Search IS NULL
          OR i.ItemName LIKE N'%' + @Search + N'%'
          OR st.Remark LIKE N'%' + @Search + N'%'
      )
    ORDER BY st.StockID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Stock_GetById
    @StockID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        st.StockID,
        st.OrgID,
        st.ItemID,
        st.Qty,
        st.Rate,
        st.Amount,
        st.Remark,
        om.OrganizationName,
        i.ItemName
    FROM dbo.StockRegister st
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = st.OrgID
    LEFT JOIN dbo.ItemMaster i ON i.ItemID = st.ItemID
    WHERE st.StockID = @StockID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Stock_Save
    @StockID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @ItemID BIGINT,
    @Qty DECIMAL(18, 2),
    @Rate DECIMAL(18, 2),
    @Remark NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Qty <= 0
    BEGIN
        RAISERROR('Quantity must be greater than zero.', 16, 1);
        RETURN;
    END

    IF @Rate < 0
    BEGIN
        RAISERROR('Rate must be greater than or equal to zero.', 16, 1);
        RETURN;
    END

    DECLARE @Amount DECIMAL(18, 2) = @Qty * @Rate;

    IF @StockID IS NULL OR @StockID = 0
    BEGIN
        INSERT INTO dbo.StockRegister (OrgID, ItemID, Qty, Rate, Amount, Remark)
        VALUES (@OrgID, @ItemID, @Qty, @Rate, @Amount, @Remark);

        SET @StockID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.StockRegister
        SET OrgID = @OrgID,
            ItemID = @ItemID,
            Qty = @Qty,
            Rate = @Rate,
            Amount = @Amount,
            Remark = @Remark
        WHERE StockID = @StockID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Stock_Delete
    @StockID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.StockRegister
    WHERE StockID = @StockID;
END
GO
