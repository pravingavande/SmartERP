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

    [Fact]
    public async Task SaveAsync_AcceptsMultipleSchools()
    {
        SetupCanRaiseTicket(10, true);
        SaveTicketRequestDto? captured = null;
        _ticketRepository
            .Setup(r => r.SaveAsync(10, null, It.IsAny<SaveTicketRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<long, string?, SaveTicketRequestDto, CancellationToken>((_, _, req, _) => captured = req)
            .ReturnsAsync(15);
        _ticketRepository
            .Setup(r => r.GetByIdAsync(15, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TicketListItemDto
            {
                TicketID = 15,
                UserID = 10,
                OrgID = 1,
                OrgIDs = "1,2",
                TicketDate = DateTime.UtcNow,
                Subject = "Network issue",
                ReplyRequired = "Instant",
                TicketStatusID = 1,
                StatusName = "Open",
                CreatedDate = DateTime.UtcNow
            });
        _ticketRepository
            .Setup(r => r.GetRepliesAsync(15, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var service = CreateService();
        var request = new SaveTicketRequestDto
        {
            OrgIDs = [1, 2],
            TicketDate = DateTime.UtcNow,
            Subject = "Network issue",
            Description = "Lab printer offline",
            Module = "IT",
            Priority = "Medium",
            ReplyRequired = "Instant"
        };

        var result = await service.SaveAsync(10, null, request, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(2, captured?.OrgIDs.Count);
        Assert.Contains(1L, captured!.OrgIDs);
        Assert.Contains(2L, captured.OrgIDs);
    }

    [Theory]
    [MemberData(nameof(SaveTicketValidationCases))]
    public async Task SaveAsync_HardcodedValidationMatrix(long[] orgIds, string subject, string replyRequired, bool shouldSave)
    {
        SetupCanRaiseTicket(10, true);
        _ticketRepository
            .Setup(r => r.SaveAsync(It.IsAny<long>(), It.IsAny<string?>(), It.IsAny<SaveTicketRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);
        _ticketRepository
            .Setup(r => r.GetByIdAsync(3, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TicketListItemDto
            {
                TicketID = 3,
                UserID = 10,
                OrgID = 1,
                TicketDate = DateTime.UtcNow,
                Subject = subject.Trim(),
                ReplyRequired = replyRequired,
                TicketStatusID = 1,
                StatusName = "Open",
                CreatedDate = DateTime.UtcNow
            });
        _ticketRepository
            .Setup(r => r.GetRepliesAsync(3, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var service = CreateService();
        var request = new SaveTicketRequestDto
        {
            OrgIDs = orgIds.ToList(),
            TicketDate = DateTime.UtcNow,
            Subject = subject,
            ReplyRequired = replyRequired
        };

        var result = await service.SaveAsync(10, null, request, CancellationToken.None);

        if (shouldSave)
        {
            Assert.NotNull(result);
            _ticketRepository.Verify(r => r.SaveAsync(It.IsAny<long>(), It.IsAny<string?>(), It.IsAny<SaveTicketRequestDto>(), It.IsAny<CancellationToken>()), Times.Once);
        }
        else
        {
            Assert.Null(result);
            _ticketRepository.Verify(r => r.SaveAsync(It.IsAny<long>(), It.IsAny<string?>(), It.IsAny<SaveTicketRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
        }
    }

    [Fact]
    public async Task AcknowledgeAsync_RejectsSansthaUser()
    {
        SetupCanRaiseTicket(20, true);
        var service = CreateService();

        var result = await service.AcknowledgeAsync(5, 20, null, CancellationToken.None);

        Assert.False(result);
        _ticketRepository.Verify(
            r => r.AcknowledgeAsync(It.IsAny<long>(), It.IsAny<long>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task AcknowledgeAsync_CallsRepositoryForSchoolUser()
    {
        SetupCanRaiseTicket(30, false);
        _ticketRepository
            .Setup(r => r.AcknowledgeAsync(5, 30, "127.0.0.1", It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var service = CreateService();

        var result = await service.AcknowledgeAsync(5, 30, "127.0.0.1", CancellationToken.None);

        Assert.True(result);
        _ticketRepository.Verify(r => r.AcknowledgeAsync(5, 30, "127.0.0.1", It.IsAny<CancellationToken>()), Times.Once);
    }

    public static TheoryData<long[], string, string, bool> SaveTicketValidationCases => new()
    {
        { [], "Printer", "Instant", false },
        { [1], "", "Instant", false },
        { [1], "Printer", "", false },
        { [1], "   ", "Instant", false },
        { [1, 2], "Lab printer down", "Later", true }
    };

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
