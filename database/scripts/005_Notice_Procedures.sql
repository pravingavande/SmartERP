-- Recent notices for dashboard widget.
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Notice_GetRecent
    @TopCount INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (@TopCount)
        ns.TID,
        ns.TDate,
        ns.Notice,
        ns.Attachment,
        CASE
            WHEN ns.TDate >= DATEADD(DAY, -30, SYSUTCDATETIME()) THEN 1
            ELSE 0
        END AS IsNew
    FROM dbo.NoticeSend ns
    ORDER BY ns.TDate DESC;
END
GO
