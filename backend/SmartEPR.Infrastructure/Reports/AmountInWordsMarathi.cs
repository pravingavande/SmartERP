namespace SmartEPR.Infrastructure.Reports;

internal static class AmountInWordsMarathi
{
    private static readonly string[] Ones =
    [
        "", "एक", "दोन", "तीन", "चार", "पाच", "सहा", "सात", "आठ", "नऊ", "दहा",
        "अकरा", "बारा", "तेरा", "चौदा", "पंधरा", "सोळा", "सत्रा", "अठरा", "एकोणीस"
    ];

    private static readonly string[] Tens =
        ["", "", "वीस", "तीस", "चाळीस", "पन्नास", "साठ", "सत्तर", "ऐंशी", "नव्वद"];

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

        if (rupees == 0 && paise == 0) return "शून्य रुपये फक्त";

        var words = rupees > 0 ? $"{ConvertIndian(rupees)} रुपये" : string.Empty;
        if (paise > 0)
        {
            var paiseWords = $"{ConvertIndian(paise)} पैसे";
            words = string.IsNullOrEmpty(words) ? paiseWords : $"{words} आणि {paiseWords}";
        }

        return $"{words} फक्त";
    }

    private static string ConvertIndian(long number)
    {
        if (number == 0) return "शून्य";
        if (number < 20) return Ones[number];
        if (number < 100)
            return $"{Tens[number / 10]}{(number % 10 > 0 ? " " + Ones[number % 10] : string.Empty)}".Trim();
        if (number < 1000)
            return $"{Ones[number / 100]}शे{(number % 100 > 0 ? " " + ConvertIndian(number % 100) : string.Empty)}".Trim();
        if (number < 100000)
            return $"{ConvertIndian(number / 1000)} हजार{(number % 1000 > 0 ? " " + ConvertIndian(number % 1000) : string.Empty)}".Trim();
        if (number < 10000000)
            return $"{ConvertIndian(number / 100000)} लाख{(number % 100000 > 0 ? " " + ConvertIndian(number % 100000) : string.Empty)}".Trim();
        return $"{ConvertIndian(number / 10000000)} कोटी{(number % 10000000 > 0 ? " " + ConvertIndian(number % 10000000) : string.Empty)}".Trim();
    }
}
