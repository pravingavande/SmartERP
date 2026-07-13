namespace SmartEPR.Core.Validation;

public static class MasterValidators
{
    public static string Trim(string? value) => (value ?? string.Empty).Trim();

    public static string? RequireText(string? value, string fieldLabel)
    {
        return string.IsNullOrWhiteSpace(value)
            ? $"{fieldLabel} is required."
            : null;
    }

    public static string? RequirePositiveId(long? value, string fieldLabel)
    {
        return value is null or <= 0
            ? $"{fieldLabel} is required."
            : null;
    }

    public static string? RequirePositiveDecimal(decimal? value, string fieldLabel)
    {
        return value is null or <= 0
            ? $"{fieldLabel} must be greater than zero."
            : null;
    }

    public static string? RequireNonNegativeDecimal(decimal value, string fieldLabel)
    {
        return value < 0
            ? $"{fieldLabel} must be greater than or equal to zero."
            : null;
    }

    public static string? RequireMonth(int month)
    {
        return month is < 1 or > 12
            ? "Month is required."
            : null;
    }

    public static string? RequireDate(DateTime date, string fieldLabel)
    {
        return date == default
            ? $"{fieldLabel} is required."
            : null;
    }

    public static string? FirstError(params string?[] errors)
    {
        foreach (var error in errors)
        {
            if (!string.IsNullOrWhiteSpace(error))
                return error;
        }

        return null;
    }
}
