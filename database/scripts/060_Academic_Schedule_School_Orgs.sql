-- Academic Scheduler lookups: first result set = school orgs (same as Teacher Master).
CREATE OR ALTER PROCEDURE dbo.sp_AcademicSchedule_GetLookups
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    -- Result set 1: Org / School (same as Teacher Master)
    EXEC dbo.sp_Audit_GetUserOrgs @UserID = @UserID;

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

PRINT 'sp_AcademicSchedule_GetLookups updated: school orgs via sp_Audit_GetUserOrgs.';
