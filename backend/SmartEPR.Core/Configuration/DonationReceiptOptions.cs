namespace SmartEPR.Core.Configuration;

public sealed class DonationReceiptOptions
{
    public const string SectionName = "DonationReceipt";

    public string EstablishmentYear { get; set; } = string.Empty;
    public string OrgPanNo { get; set; } = string.Empty;
    public string RegistrationNo { get; set; } = string.Empty;
    public string OrderNo80G { get; set; } = string.Empty;
    public string OrderDate80G { get; set; } = string.Empty;
    public string SansthaAddress { get; set; } = string.Empty;
    public string ReceiverSignatureName { get; set; } = string.Empty;
}
