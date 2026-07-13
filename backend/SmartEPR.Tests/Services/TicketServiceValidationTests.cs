using Moq;
using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.DTOs.Ticket;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class TicketServiceValidationTests
{
    private readonly Mock<ITicketRepository> _ticketRepository = new();
    private readonly Mock<IAuditVoucherRepository> _auditRepository = new();
    private readonly Mock<ITicketNotificationService> _notificationService = new();

    private TicketService CreateService() =>
        new(_ticketRepository.Object, _auditRepository.Object, _notificationService.Object);

    private void SetupCanRaiseTicket(long userId, bool canRaise)
    {
        _ticketRepository
            .Setup(r => r.GetUserContextAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TicketUserContextDto { UserID = userId, CanRaiseTicket = canRaise, IsSansthaUser = canRaise });
    }

    [Fact]
    public async Task SaveAsync_RejectsWhenUserCannotRaiseTicket()
    {
        SetupCanRaiseTicket(10, false);
        var service = CreateService();

        var result = await service.SaveAsync(10, null, ValidTicketRequest(), CancellationToken.None);

        Assert.Null(result);
        _ticketRepository.Verify(r => r.SaveAsync(It.IsAny<long>(), It.IsAny<string?>(), It.IsAny<SaveTicketRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveAsync_RejectsEmptySchools()
    {
        SetupCanRaiseTicket(10, true);
        var service = CreateService();
        var request = new SaveTicketRequestDto
        {
            OrgIDs = [],
            TicketDate = DateTime.UtcNow,
            Subject = "Printer not working",
            ReplyRequired = "Instant"
        };

        var result = await service.SaveAsync(10, null, request, CancellationToken.None);

        Assert.Null(result);
        _ticketRepository.Verify(r => r.SaveAsync(It.IsAny<long>(), It.IsAny<string?>(), It.IsAny<SaveTicketRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveAsync_RejectsBlankSubject()
    {
        SetupCanRaiseTicket(10, true);
        var service = CreateService();
        var request = ValidTicketRequest();
        request = new SaveTicketRequestDto
        {
            OrgIDs = request.OrgIDs,
            TicketDate = request.TicketDate,
            Subject = "   ",
            Description = request.Description,
            Module = request.Module,
            Priority = request.Priority,
            ReplyRequired = request.ReplyRequired
        };

        var result = await service.SaveAsync(10, null, request, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task SaveAsync_RejectsBlankReplyRequired()
    {
        SetupCanRaiseTicket(10, true);
        var service = CreateService();
        var request = ValidTicketRequest();
        request = new SaveTicketRequestDto
        {
            OrgIDs = request.OrgIDs,
            TicketDate = request.TicketDate,
            Subject = request.Subject,
            Description = request.Description,
            Module = request.Module,
            Priority = request.Priority,
            ReplyRequired = ""
        };

        var result = await service.SaveAsync(10, null, request, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task AddReplyAsync_RejectsBlankReplyText()
    {
        var service = CreateService();
        var request = new SaveTicketReplyRequestDto { TicketID = 5, ReplyText = "  " };

        var result = await service.AddReplyAsync(10, null, request, CancellationToken.None);

        Assert.Null(result);
        _ticketRepository.Verify(r => r.AddReplyAsync(It.IsAny<long>(), It.IsAny<string?>(), It.IsAny<SaveTicketReplyRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task AddReplyAsync_RejectsInvalidTicketId()
    {
        var service = CreateService();
        var request = new SaveTicketReplyRequestDto { TicketID = 0, ReplyText = "Update" };

        var result = await service.AddReplyAsync(10, null, request, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_RejectsReadOnlyUser()
    {
        SetupCanRaiseTicket(10, false);
        var service = CreateService();

        var deleted = await service.DeleteAsync(99, 10, CancellationToken.None);

        Assert.False(deleted);
        _ticketRepository.Verify(r => r.DeleteAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetDetailAsync_SetsCanEditFalseForNonCreator()
    {
        _ticketRepository
            .Setup(r => r.GetByIdAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TicketListItemDto
            {
                TicketID = 5,
                UserID = 20,
                OrgID = 1,
                TicketDate = DateTime.UtcNow,
                TicketStatusID = 1,
                StatusName = "Open",
                CreatedDate = DateTime.UtcNow
            });
        _ticketRepository
            .Setup(r => r.GetRepliesAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        SetupCanRaiseTicket(10, true);

        var service = CreateService();
        var detail = await service.GetDetailAsync(5, 10, CancellationToken.None);

        Assert.NotNull(detail);
        Assert.False(detail!.CanEdit);
        Assert.True(detail.CanReply);
    }

    [Fact]
    public async Task GetDetailAsync_SetsCanEditTrueForCreatorOnOpenTicket()
    {
        _ticketRepository
            .Setup(r => r.GetByIdAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TicketListItemDto
            {
                TicketID = 5,
                UserID = 10,
                OrgID = 1,
                TicketDate = DateTime.UtcNow,
                TicketStatusID = 1,
                StatusName = "Open",
                CreatedDate = DateTime.UtcNow
            });
        _ticketRepository
            .Setup(r => r.GetRepliesAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        SetupCanRaiseTicket(10, true);

        var service = CreateService();
        var detail = await service.GetDetailAsync(5, 10, CancellationToken.None);

        Assert.NotNull(detail);
        Assert.True(detail!.CanEdit);
        Assert.True(detail.CanClose);
    }

    private static SaveTicketRequestDto ValidTicketRequest() => new()
    {
        OrgIDs = [1],
        TicketDate = DateTime.UtcNow,
        Subject = "Printer not working",
        Description = "Lab printer offline",
        Module = "IT",
        Priority = "Medium",
        ReplyRequired = "Instant"
    };
}
