namespace SmartEPR.Core.Entities;

public sealed class DashboardSummary
{
    public string SansthaName { get; init; } = string.Empty;
    public int TotalSchool { get; init; }
    public int TotalStudent { get; init; }
    public int TotalTeacher { get; init; }
    public int TeachingStaff { get; init; }
    public int NonTeachingStaff { get; init; }
    public int PermanentStaff { get; init; }
    public int TemporaryStaff { get; init; }
    public int MaleStudents { get; init; }
    public int FemaleStudents { get; init; }
    public int MaleTeachers { get; init; }
    public int FemaleTeachers { get; init; }
}
