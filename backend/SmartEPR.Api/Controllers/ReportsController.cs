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
    private readonly IModuleReportService _moduleReportService;

    public ReportsController(
        IDonationReportService donationReportService,
        ICashBookReportService cashBookReportService,
        IModuleReportService moduleReportService)
    {
        _donationReportService = donationReportService;
        _cashBookReportService = cashBookReportService;
        _moduleReportService = moduleReportService;
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
                AccountRegisterID = accountRegisterId is > 0 ? accountRegisterId.Value : 0
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

    [HttpGet("audit/voucher-ledger/pdf")]
    public async Task<IActionResult> GetVoucherLedgerPdf(
        [FromQuery] long? orgId,
        [FromQuery] long? ledgerHeadId,
        [FromQuery] bool allLedgerHeads,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken)
    {
        if (orgId is null or <= 0)
            return BadRequest(ApiResponse<bool>.Fail("School / Organization is required."));
        if (!allLedgerHeads && ledgerHeadId is null or <= 0)
            return BadRequest(ApiResponse<bool>.Fail("Ledger Head is required when not selecting all ledger heads."));
        if (fromDate is null || toDate is null)
            return BadRequest(ApiResponse<bool>.Fail("From Date and To Date are required."));

        return await RenderModulePdfAsync(
            _moduleReportService.RenderVoucherLedgerPdfAsync(
                new ModuleReportFilterDto
                {
                    OrgID = orgId,
                    LedgerHeadID = ledgerHeadId,
                    AllLedgerHeads = allLedgerHeads,
                    FromDate = fromDate,
                    ToDate = toDate
                },
                cancellationToken),
            "VoucherLedgerReport.pdf").ConfigureAwait(false);
    }

    [HttpGet("audit/trial-balance/pdf")]
    public async Task<IActionResult> GetTrialBalancePdf(
        [FromQuery] long? orgId,
        CancellationToken cancellationToken)
    {
        if (orgId is null or <= 0)
            return BadRequest(ApiResponse<bool>.Fail("School / Organization is required."));

        return await RenderModulePdfAsync(
            _moduleReportService.RenderTrialBalancePdfAsync(orgId.Value, cancellationToken),
            "TrialBalanceReport.pdf").ConfigureAwait(false);
    }

    [HttpGet("school/details/pdf")]
    public async Task<IActionResult> GetSchoolDetailsPdf(
        [FromQuery] long? sansthaId,
        CancellationToken cancellationToken)
    {
        if (sansthaId is null or <= 0)
            return BadRequest(ApiResponse<bool>.Fail("Sanstha is required."));

        return await RenderModulePdfAsync(
            _moduleReportService.RenderSchoolDetailsPdfAsync(sansthaId.Value, cancellationToken),
            "SchoolCollegeReport.pdf").ConfigureAwait(false);
    }

    [HttpGet("school/employees/pdf")]
    public async Task<IActionResult> GetEmployeePdf(
        [FromQuery] long? orgId,
        [FromQuery] long? sansthaId,
        CancellationToken cancellationToken)
    {
        var validation = ValidateSchoolOrSanstha(orgId, sansthaId);
        if (validation is not null) return validation;

        return await RenderModulePdfAsync(
            _moduleReportService.RenderEmployeePdfAsync(BuildModuleFilter(orgId, sansthaId), cancellationToken),
            "EmployeeReport.pdf").ConfigureAwait(false);
    }

    [HttpGet("school/employees-seniority/pdf")]
    public async Task<IActionResult> GetEmployeeSeniorityPdf(
        [FromQuery] long? orgId,
        [FromQuery] long? sansthaId,
        CancellationToken cancellationToken)
    {
        var validation = ValidateSchoolOrSanstha(orgId, sansthaId);
        if (validation is not null) return validation;

        return await RenderModulePdfAsync(
            _moduleReportService.RenderEmployeeSeniorityPdfAsync(BuildModuleFilter(orgId, sansthaId), cancellationToken),
            "EmployeeSeniorityReport.pdf").ConfigureAwait(false);
    }

    [HttpGet("school/employees-retired/pdf")]
    public async Task<IActionResult> GetRetiredEmployeePdf(
        [FromQuery] long? orgId,
        [FromQuery] long? sansthaId,
        CancellationToken cancellationToken)
    {
        var validation = ValidateSchoolOrSanstha(orgId, sansthaId);
        if (validation is not null) return validation;

        return await RenderModulePdfAsync(
            _moduleReportService.RenderRetiredEmployeePdfAsync(BuildModuleFilter(orgId, sansthaId), cancellationToken),
            "RetiredEmployeeReport.pdf").ConfigureAwait(false);
    }

    [HttpGet("school/inward-register/pdf")]
    public async Task<IActionResult> GetInwardRegisterPdf(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken)
    {
        if (fromDate is null || toDate is null)
            return BadRequest(ApiResponse<bool>.Fail("From Date and To Date are required."));

        return await RenderModulePdfAsync(
            _moduleReportService.RenderInwardRegisterPdfAsync(
                new ModuleReportFilterDto { FromDate = fromDate, ToDate = toDate },
                cancellationToken),
            "InwardRegisterReport.pdf").ConfigureAwait(false);
    }

    [HttpGet("school/outward-register/pdf")]
    public async Task<IActionResult> GetOutwardRegisterPdf(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken)
    {
        if (fromDate is null || toDate is null)
            return BadRequest(ApiResponse<bool>.Fail("From Date and To Date are required."));

        return await RenderModulePdfAsync(
            _moduleReportService.RenderOutwardRegisterPdfAsync(
                new ModuleReportFilterDto { FromDate = fromDate, ToDate = toDate },
                cancellationToken),
            "OutwardRegisterReport.pdf").ConfigureAwait(false);
    }

    [HttpGet("stock/register/pdf")]
    public async Task<IActionResult> GetStockRegisterPdf(
        [FromQuery] long? orgId,
        [FromQuery] long? itemGroupId,
        CancellationToken cancellationToken)
    {
        if (orgId is null or <= 0)
            return BadRequest(ApiResponse<bool>.Fail("School / Organization is required."));

        return await RenderModulePdfAsync(
            _moduleReportService.RenderStockRegisterPdfAsync(
                new ModuleReportFilterDto
                {
                    OrgID = orgId,
                    ItemGroupID = itemGroupId
                },
                cancellationToken),
            "StockRegisterReport.pdf").ConfigureAwait(false);
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

    private static ModuleReportFilterDto BuildModuleFilter(long? orgId, long? sansthaId) =>
        new()
        {
            OrgID = orgId,
            SansthaID = sansthaId
        };

    private static IActionResult? ValidateSchoolOrSanstha(long? orgId, long? sansthaId)
    {
        if ((orgId is null or <= 0) && (sansthaId is null or <= 0))
            return new BadRequestObjectResult(ApiResponse<bool>.Fail("School or Sanstha is required."));
        if (orgId is > 0 && sansthaId is > 0)
            return new BadRequestObjectResult(ApiResponse<bool>.Fail("Specify either School or Sanstha, not both."));
        return null;
    }

    private async Task<IActionResult> RenderDonationPdfAsync(Task<byte[]?> task, string fileName)
    {
        var pdf = await task.ConfigureAwait(false);
        if (pdf is null || pdf.Length == 0)
            return NotFound(ApiResponse<bool>.Fail("No donation records found for the selected filters."));

        return new FileContentResult(pdf, "application/pdf") { FileDownloadName = fileName };
    }

    private async Task<IActionResult> RenderModulePdfAsync(Task<byte[]?> task, string fileName)
    {
        var pdf = await task.ConfigureAwait(false);
        if (pdf is null || pdf.Length == 0)
            return NotFound(ApiResponse<bool>.Fail("No records found for the selected filters."));

        return new FileContentResult(pdf, "application/pdf") { FileDownloadName = fileName };
    }
}
