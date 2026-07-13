using System.Globalization;

namespace SmartEPR.Infrastructure.Reports;

internal static class AmountInWords
{
    private static readonly string[] Ones =
    [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];

    private static readonly string[] Tens =
        ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    public static string ToIndianRupees(decimal amount)
    {
        if (amount < 0) return string.Empty;
        var rupees = (long)Math.Floor(amount);
        var paise = (int)Math.Round((amount - rupees) * 100, 0, MidpointRounding.AwayFromZero);
        if (paise == 100)
        {
            rupees += 1;
            paise = 0;
        }

        if (rupees == 0 && paise == 0) return "Zero Rupees Only";

        var words = rupees > 0 ? $"{ConvertIndian(rupees)} Rupee{(rupees == 1 ? "" : "s")}" : string.Empty;
        if (paise > 0)
        {
            var paiseWords = $"{ConvertIndian(paise)} Paise";
            words = string.IsNullOrEmpty(words) ? paiseWords : $"{words} and {paiseWords}";
        }

        return $"{words} Only";
    }

    private static string ConvertIndian(long number)
    {
        if (number == 0) return "Zero";
        if (number < 20) return Ones[number];
        if (number < 100) return $"{Tens[number / 10]}{(number % 10 > 0 ? " " + Ones[number % 10] : string.Empty)}".Trim();
        if (number < 1000) return $"{Ones[number / 100]} Hundred{(number % 100 > 0 ? " " + ConvertIndian(number % 100) : string.Empty)}".Trim();
        if (number < 100000) return $"{ConvertIndian(number / 1000)} Thousand{(number % 1000 > 0 ? " " + ConvertIndian(number % 1000) : string.Empty)}".Trim();
        if (number < 10000000) return $"{ConvertIndian(number / 100000)} Lakh{(number % 100000 > 0 ? " " + ConvertIndian(number % 100000) : string.Empty)}".Trim();
        return $"{ConvertIndian(number / 10000000)} Crore{(number % 10000000 > 0 ? " " + ConvertIndian(number % 10000000) : string.Empty)}".Trim();
    }

    public static string FormatCurrency(decimal amount) =>
        amount.ToString("C", CultureInfo.CreateSpecificCulture("en-IN"));
}
