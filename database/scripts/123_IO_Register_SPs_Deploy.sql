-- Deploy Inward/Outward CRUD SPs for SmartERP_TESTING schema
-- (YearIOMaster has FromDate/ToDate, not YearLabel; tables may lack UserID/CreatedOn/ModifiedOn)
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.InwardRegister', N'UserID') IS NULL
    ALTER TABLE dbo.InwardRegister ADD UserID BIGINT NULL;
GO

IF COL_LENGTH(N'dbo.InwardRegister', N'CreatedOn') IS NULL
    ALTER TABLE dbo.InwardRegister ADD CreatedOn DATETIME2 NOT NULL CONSTRAINT DF_InwardRegister_CreatedOn DEFAULT (SYSUTCDATETIME());
GO

IF COL_LENGTH(N'dbo.InwardRegister', N'ModifiedOn') IS NULL
    ALTER TABLE dbo.InwardRegister ADD ModifiedOn DATETIME2 NULL;
GO

IF COL_LENGTH(N'dbo.OutwardRegister', N'UserID') IS NULL
    ALTER TABLE dbo.OutwardRegister ADD UserID BIGINT NULL;
GO

IF COL_LENGTH(N'dbo.OutwardRegister', N'CreatedOn') IS NULL
    ALTER TABLE dbo.OutwardRegister ADD CreatedOn DATETIME2 NOT NULL CONSTRAINT DF_OutwardRegister_CreatedOn DEFAULT (SYSUTCDATETIME());
GO

IF COL_LENGTH(N'dbo.OutwardRegister', N'ModifiedOn') IS NULL
    ALTER TABLE dbo.OutwardRegister ADD ModifiedOn DATETIME2 NULL;
GO

CREATE OR ALTER PROCEDURE dbo.sp_IO_GetLookups
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    EXEC dbo.sp_Audit_GetUserOrgs @UserID = @UserID;

    SELECT
        y.YIOID,
        y.YearName,
        y.YearName AS YearLabel,
        y.IsActive
    FROM dbo.YearIOMaster y
    ORDER BY y.YearName DESC, y.YIOID DESC;

    SELECT TOP 1
        y.YIOID,
        y.YearName,
        y.YearName AS YearLabel
    FROM dbo.YearIOMaster y
    WHERE y.IsActive = 1
    ORDER BY y.YIOID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_IO_GetActiveYear
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        y.YIOID,
        y.YearName,
        y.YearName AS YearLabel
    FROM dbo.YearIOMaster y
    WHERE y.IsActive = 1
    ORDER BY y.YIOID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Inward_GetNextRecordNo
    @OrgID BIGINT,
    @YIOID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UseYIOID BIGINT = @YIOID;

    IF @UseYIOID IS NULL
    BEGIN
        SELECT TOP 1 @UseYIOID = y.YIOID
        FROM dbo.YearIOMaster y
        WHERE y.IsActive = 1
        ORDER BY y.YIOID DESC;
    END

    IF @UseYIOID IS NULL
    BEGIN
        RAISERROR('No active IO year configured.', 16, 1);
        RETURN;
    END

    SELECT
        ISNULL(MAX(i.RecordNo), 0) + 1 AS NextRecordNo,
        @UseYIOID AS YIOID
    FROM dbo.InwardRegister i
    WHERE i.OrgID = @OrgID
      AND i.YIOID = @UseYIOID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Inward_GetList
    @OrgID BIGINT,
    @YIOID BIGINT = NULL,
    @RecordNo INT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @FileNo NVARCHAR(100) = NULL,
    @LetterNo NVARCHAR(100) = NULL,
    @Subject NVARCHAR(200) = NULL,
    @FromWhomReceived NVARCHAR(200) = NULL,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.IRID,
        i.OrgID,
        i.RecordNo,
        i.IRDate,
        i.FileNo,
        i.LetterNo,
        i.FromWhomReceived,
        i.Subject,
        i.ToWhomIssued,
        i.Remark,
        i.AttachmentPath,
        i.YIOID,
        om.OrganizationName,
        y.YearName
    FROM dbo.InwardRegister i
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = i.OrgID
    LEFT JOIN dbo.YearIOMaster y ON y.YIOID = i.YIOID
    WHERE i.OrgID = @OrgID
      AND (@YIOID IS NULL OR i.YIOID = @YIOID)
      AND (@RecordNo IS NULL OR i.RecordNo = @RecordNo)
      AND (@FromDate IS NULL OR CAST(i.IRDate AS DATE) >= @FromDate)
      AND (@ToDate IS NULL OR CAST(i.IRDate AS DATE) <= @ToDate)
      AND (@FileNo IS NULL OR i.FileNo LIKE N'%' + @FileNo + N'%')
      AND (@LetterNo IS NULL OR i.LetterNo LIKE N'%' + @LetterNo + N'%')
      AND (@Subject IS NULL OR i.Subject LIKE N'%' + @Subject + N'%')
      AND (@FromWhomReceived IS NULL OR i.FromWhomReceived LIKE N'%' + @FromWhomReceived + N'%')
      AND (
          @Search IS NULL
          OR i.Subject LIKE N'%' + @Search + N'%'
          OR i.FromWhomReceived LIKE N'%' + @Search + N'%'
          OR i.FileNo LIKE N'%' + @Search + N'%'
          OR i.LetterNo LIKE N'%' + @Search + N'%'
          OR i.Remark LIKE N'%' + @Search + N'%'
      )
    ORDER BY i.RecordNo DESC, i.IRID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Inward_GetById
    @IRID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.IRID,
        i.OrgID,
        i.RecordNo,
        i.IRDate,
        i.FileNo,
        i.LetterNo,
        i.FromWhomReceived,
        i.Subject,
        i.ToWhomIssued,
        i.Remark,
        i.AttachmentPath,
        i.YIOID,
        om.OrganizationName,
        y.YearName
    FROM dbo.InwardRegister i
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = i.OrgID
    LEFT JOIN dbo.YearIOMaster y ON y.YIOID = i.YIOID
    WHERE i.IRID = @IRID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Inward_Save
    @IRID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @IRDate DATE,
    @FileNo NVARCHAR(100) = NULL,
    @LetterNo NVARCHAR(100) = NULL,
    @FromWhomReceived NVARCHAR(500),
    @Subject NVARCHAR(1000),
    @ToWhomIssued NVARCHAR(500) = NULL,
    @Remark NVARCHAR(2000) = NULL,
    @AttachmentPath NVARCHAR(500) = NULL,
    @UserID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @IRDate IS NULL
    BEGIN
        RAISERROR('Inward date is required.', 16, 1);
        RETURN;
    END

    IF @FromWhomReceived IS NULL OR LTRIM(RTRIM(@FromWhomReceived)) = N''
    BEGIN
        RAISERROR('From whom received is required.', 16, 1);
        RETURN;
    END

    IF @Subject IS NULL OR LTRIM(RTRIM(@Subject)) = N''
    BEGIN
        RAISERROR('Subject is required.', 16, 1);
        RETURN;
    END

    DECLARE @YIOID BIGINT;
    DECLARE @RecordNo INT;

    IF @IRID IS NULL OR @IRID = 0
    BEGIN
        SELECT TOP 1 @YIOID = y.YIOID
        FROM dbo.YearIOMaster y
        WHERE y.IsActive = 1
        ORDER BY y.YIOID DESC;

        IF @YIOID IS NULL
        BEGIN
            RAISERROR('No active IO year configured.', 16, 1);
            RETURN;
        END

        SELECT @RecordNo = ISNULL(MAX(i.RecordNo), 0) + 1
        FROM dbo.InwardRegister i
        WHERE i.OrgID = @OrgID
          AND i.YIOID = @YIOID;

        INSERT INTO dbo.InwardRegister (
            OrgID, RecordNo, IRDate, FileNo, LetterNo, FromWhomReceived, Subject,
            ToWhomIssued, Remark, AttachmentPath, YIOID, UserID
        )
        VALUES (
            @OrgID, @RecordNo, @IRDate, @FileNo, @LetterNo, @FromWhomReceived, @Subject,
            @ToWhomIssued, @Remark, @AttachmentPath, @YIOID, @UserID
        );

        SET @IRID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.InwardRegister
        SET OrgID = @OrgID,
            IRDate = @IRDate,
            FileNo = @FileNo,
            LetterNo = @LetterNo,
            FromWhomReceived = @FromWhomReceived,
            Subject = @Subject,
            ToWhomIssued = @ToWhomIssued,
            Remark = @Remark,
            AttachmentPath = @AttachmentPath,
            ModifiedOn = SYSUTCDATETIME()
        WHERE IRID = @IRID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Inward_Delete
    @IRID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.InwardRegister WHERE IRID = @IRID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Outward_GetNextRecordNo
    @OrgID BIGINT,
    @YIOID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UseYIOID BIGINT = @YIOID;

    IF @UseYIOID IS NULL
    BEGIN
        SELECT TOP 1 @UseYIOID = y.YIOID
        FROM dbo.YearIOMaster y
        WHERE y.IsActive = 1
        ORDER BY y.YIOID DESC;
    END

    IF @UseYIOID IS NULL
    BEGIN
        RAISERROR('No active IO year configured.', 16, 1);
        RETURN;
    END

    SELECT
        ISNULL(MAX(o.RecordNo), 0) + 1 AS NextRecordNo,
        @UseYIOID AS YIOID
    FROM dbo.OutwardRegister o
    WHERE o.OrgID = @OrgID
      AND o.YIOID = @UseYIOID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Outward_GetList
    @OrgID BIGINT,
    @YIOID BIGINT = NULL,
    @RecordNo INT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @FileNo NVARCHAR(100) = NULL,
    @Subject NVARCHAR(200) = NULL,
    @Address NVARCHAR(200) = NULL,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        o.ORID,
        o.OrgID,
        o.RecordNo,
        o.ORDate,
        o.Enclosures,
        o.Address,
        o.Subject,
        o.FileNo,
        o.ORRDate,
        o.ExpensesAmt,
        o.Remark,
        o.AttachmentPath,
        o.YIOID,
        om.OrganizationName,
        y.YearName
    FROM dbo.OutwardRegister o
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = o.OrgID
    LEFT JOIN dbo.YearIOMaster y ON y.YIOID = o.YIOID
    WHERE o.OrgID = @OrgID
      AND (@YIOID IS NULL OR o.YIOID = @YIOID)
      AND (@RecordNo IS NULL OR o.RecordNo = @RecordNo)
      AND (@FromDate IS NULL OR CAST(o.ORDate AS DATE) >= @FromDate)
      AND (@ToDate IS NULL OR CAST(o.ORDate AS DATE) <= @ToDate)
      AND (@FileNo IS NULL OR o.FileNo LIKE N'%' + @FileNo + N'%')
      AND (@Subject IS NULL OR o.Subject LIKE N'%' + @Subject + N'%')
      AND (@Address IS NULL OR o.Address LIKE N'%' + @Address + N'%')
      AND (
          @Search IS NULL
          OR o.Subject LIKE N'%' + @Search + N'%'
          OR o.Address LIKE N'%' + @Search + N'%'
          OR o.FileNo LIKE N'%' + @Search + N'%'
          OR o.Remark LIKE N'%' + @Search + N'%'
      )
    ORDER BY o.RecordNo DESC, o.ORID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Outward_GetById
    @ORID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        o.ORID,
        o.OrgID,
        o.RecordNo,
        o.ORDate,
        o.Enclosures,
        o.Address,
        o.Subject,
        o.FileNo,
        o.ORRDate,
        o.ExpensesAmt,
        o.Remark,
        o.AttachmentPath,
        o.YIOID,
        om.OrganizationName,
        y.YearName
    FROM dbo.OutwardRegister o
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = o.OrgID
    LEFT JOIN dbo.YearIOMaster y ON y.YIOID = o.YIOID
    WHERE o.ORID = @ORID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Outward_Save
    @ORID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @ORDate DATE,
    @Enclosures NVARCHAR(500) = NULL,
    @Address NVARCHAR(1000),
    @Subject NVARCHAR(1000),
    @FileNo NVARCHAR(100) = NULL,
    @ORRDate DATE = NULL,
    @ExpensesAmt DECIMAL(18, 2) = 0,
    @Remark NVARCHAR(2000) = NULL,
    @AttachmentPath NVARCHAR(500) = NULL,
    @UserID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @ORDate IS NULL
    BEGIN
        RAISERROR('Outward date is required.', 16, 1);
        RETURN;
    END

    IF @Address IS NULL OR LTRIM(RTRIM(@Address)) = N''
    BEGIN
        RAISERROR('Address is required.', 16, 1);
        RETURN;
    END

    IF @Subject IS NULL OR LTRIM(RTRIM(@Subject)) = N''
    BEGIN
        RAISERROR('Subject is required.', 16, 1);
        RETURN;
    END

    IF @ExpensesAmt < 0
    BEGIN
        RAISERROR('Expenses amount must be greater than or equal to zero.', 16, 1);
        RETURN;
    END

    DECLARE @YIOID BIGINT;
    DECLARE @RecordNo INT;

    IF @ORID IS NULL OR @ORID = 0
    BEGIN
        SELECT TOP 1 @YIOID = y.YIOID
        FROM dbo.YearIOMaster y
        WHERE y.IsActive = 1
        ORDER BY y.YIOID DESC;

        IF @YIOID IS NULL
        BEGIN
            RAISERROR('No active IO year configured.', 16, 1);
            RETURN;
        END

        SELECT @RecordNo = ISNULL(MAX(o.RecordNo), 0) + 1
        FROM dbo.OutwardRegister o
        WHERE o.OrgID = @OrgID
          AND o.YIOID = @YIOID;

        INSERT INTO dbo.OutwardRegister (
            OrgID, RecordNo, ORDate, Enclosures, Address, Subject, FileNo,
            ORRDate, ExpensesAmt, Remark, AttachmentPath, YIOID, UserID
        )
        VALUES (
            @OrgID, @RecordNo, @ORDate, @Enclosures, @Address, @Subject, @FileNo,
            @ORRDate, @ExpensesAmt, @Remark, @AttachmentPath, @YIOID, @UserID
        );

        SET @ORID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.OutwardRegister
        SET OrgID = @OrgID,
            ORDate = @ORDate,
            Enclosures = @Enclosures,
            Address = @Address,
            Subject = @Subject,
            FileNo = @FileNo,
            ORRDate = @ORRDate,
            ExpensesAmt = @ExpensesAmt,
            Remark = @Remark,
            AttachmentPath = @AttachmentPath,
            ModifiedOn = SYSUTCDATETIME()
        WHERE ORID = @ORID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Outward_Delete
    @ORID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.OutwardRegister WHERE ORID = @ORID;
END
GO

PRINT '123_IO_Register_SPs_Deploy applied.';
GO
