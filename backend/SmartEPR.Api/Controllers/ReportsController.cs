using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Reports;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/reports")]
public sealed class ReportsController : ControllerBase
{
    private readonly IDonationReportService _donationReportService;
    private readonly ICashBookReportService _cashBookReportService;

    public ReportsController(
        IDonationReportService donationReportService,
        ICashBookReportService cashBookReportService)
    {
        _donationReportService = donationReportService;
        _cashBookReportService = cashBookReportService;
    }

    /// <summary>Cash Book Report / मुख्य किर्द रिपोर्ट — filters: School, From Date, To Date.</summary>
    [HttpGet("cash-book/pdf")]
    public async Task<IActionResult> GetCashBookPdf(
        [FromQuery] long? orgId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] long? accountRegisterId,
        CancellationToken cancellationToken)
    {
        if (orgId is null or <= 0)
            return BadRequest(ApiResponse<bool>.Fail("School / Organization is required."));
        if (fromDate is null || toDate is null)
            return BadRequest(ApiResponse<bool>.Fail("From Date and To Date are required."));

        var pdf = await _cashBookReportService.RenderCashBookPdfAsync(
            new CashBookReportFilterDto
            {
                OrgID = orgId.Value,
                FromDate = fromDate,
                ToDate = toDate,
                AccountRegisterID = accountRegisterId is > 0 ? accountRegisterId.Value : 1
            },
            cancellationToken).ConfigureAwait(false);

        if (pdf is null || pdf.Length == 0)
            return NotFound(ApiResponse<bool>.Fail("No cash book records found for the selected filters."));

        return new FileContentResult(pdf, "application/pdf") { FileDownloadName = "CashBookReport.pdf" };
    }

    [HttpGet("donation/detail/pdf")]
    public async Task<IActionResult> GetDonationDetailPdf(
        [FromQuery] long? orgId,
        [FromQuery] long? drHeadId,
        [FromQuery] long? paymentTypeId,
        [FromQuery] decimal? minAmount,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken)
    {
        return await RenderDonationPdfAsync(
            _donationReportService.RenderDonationDetailReportPdfAsync(BuildFilter(orgId, drHeadId, paymentTypeId, minAmount, fromDate, toDate), cancellationToken),
            "DonationDetailReport.pdf").ConfigureAwait(false);
    }

    [HttpGet("donation/school-wise/pdf")]
    public async Task<IActionResult> GetDonationSchoolWisePdf(
        [FromQuery] long? orgId,
        [FromQuery] long? drHeadId,
        [FromQuery] long? paymentTypeId,
        [FromQuery] decimal? minAmount,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken)
    {
        return await RenderDonationPdfAsync(
            _donationReportService.RenderDonationSchoolWiseDetailReportPdfAsync(BuildFilter(orgId, drHeadId, paymentTypeId, minAmount, fromDate, toDate), cancellationToken),
            "DonationSchoolWiseDetailReport.pdf").ConfigureAwait(false);
    }

    [HttpGet("donation/user-wise/pdf")]
    public async Task<IActionResult> GetDonationUserWisePdf(
        [FromQuery] long? orgId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken)
    {
        return await RenderDonationPdfAsync(
            _donationReportService.RenderDonationUserWiseDetailReportPdfAsync(BuildFilter(orgId, null, null, null, fromDate, toDate), cancellationToken),
            "DonationUserWiseDetailReport.pdf").ConfigureAwait(false);
    }

    private static DonationReportFilterDto BuildFilter(
        long? orgId,
        long? drHeadId,
        long? paymentTypeId,
        decimal? minAmount,
        DateTime? fromDate,
        DateTime? toDate) =>
        new()
        {
            OrgID = orgId,
            DRHeadID = drHeadId,
            PaymentTypeID = paymentTypeId,
            MinAmount = minAmount,
            FromDate = fromDate,
            ToDate = toDate
        };

    private async Task<IActionResult> RenderDonationPdfAsync(Task<byte[]?> task, string fileName)
    {
        var pdf = await task.ConfigureAwait(false);
        if (pdf is null || pdf.Length == 0)
            return NotFound(ApiResponse<bool>.Fail("No donation records found for the selected filters."));

        return new FileContentResult(pdf, "application/pdf") { FileDownloadName = fileName };
    }
}
