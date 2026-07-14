using Moq;
using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.DTOs.Calendar;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class EventCalendarServiceValidationTests
{
    private readonly Mock<IEventCalendarRepository> _eventRepository = new();
    private readonly Mock<IUserRepository> _userRepository = new();
    private readonly Mock<IAuditVoucherRepository> _auditRepository = new();

    private EventCalendarService CreateService() =>
        new(_eventRepository.Object, _userRepository.Object, _auditRepository.Object);

    private void SetupCanManageEvents(long userId, bool canManage)
    {
        _eventRepository
            .Setup(r => r.GetUserContextAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EventUserContextItem { CanManageEvents = canManage, UserRoleID = canManage ? 1 : 4 });
    }

    [Fact]
    public async Task SaveEventAsync_RejectsReadOnlyUser()
    {
        SetupCanManageEvents(10, false);
        var service = CreateService();

        var result = await service.SaveEventAsync(10, ValidEventRequest(), CancellationToken.None);

        Assert.Null(result);
        _eventRepository.Verify(r => r.SaveEventAsync(It.IsAny<SaveEventEntity>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveEventAsync_RejectsEmptySchools()
    {
        SetupCanManageEvents(10, true);
        var service = CreateService();
        var request = new SaveEventRequestDto
        {
            Title = "Annual Day",
            Location = "Auditorium",
            EventDate = DateTime.UtcNow.Date,
            Status = "नियोजित",
            OrgIDs = [],
            UnderOrgID = 1
        };

        var result = await service.SaveEventAsync(10, request, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task SaveEventAsync_RejectsBlankTitle()
    {
        SetupCanManageEvents(10, true);
        var service = CreateService();
        var request = new SaveEventRequestDto
        {
            Title = "   ",
            Location = "Auditorium",
            EventDate = DateTime.UtcNow.Date,
            Status = "नियोजित",
            OrgIDs = [1],
            UnderOrgID = 1
        };

        var result = await service.SaveEventAsync(10, request, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task SaveEventAsync_RejectsBlankLocation()
    {
        SetupCanManageEvents(10, true);
        var service = CreateService();
        var request = new SaveEventRequestDto
        {
            Title = "Annual Day",
            Location = "  ",
            EventDate = DateTime.UtcNow.Date,
            Status = "नियोजित",
            OrgIDs = [1],
            UnderOrgID = 1
        };

        var result = await service.SaveEventAsync(10, request, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task SaveEventTypeAsync_RejectsBlankName()
    {
        SetupCanManageEvents(10, true);
        var service = CreateService();

        var result = await service.SaveEventTypeAsync(10, new SaveEventTypeRequestDto
        {
            UnderOrgID = 1,
            EventType = "  ",
            IsActive = true
        }, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task SaveEventTypeAsync_RejectsReadOnlyUser()
    {
        SetupCanManageEvents(10, false);
        var service = CreateService();

        var result = await service.SaveEventTypeAsync(10, new SaveEventTypeRequestDto
        {
            UnderOrgID = 1,
            EventType = "Meeting",
            IsActive = true
        }, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task SaveLocationAsync_RejectsBlankLocationName()
    {
        SetupCanManageEvents(10, true);
        var service = CreateService();

        var result = await service.SaveLocationAsync(10, new SaveLocationRequestDto
        {
            UnderOrgID = 1,
            LocationName = "  "
        }, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteEventAsync_RejectsReadOnlyUser()
    {
        SetupCanManageEvents(10, false);
        var service = CreateService();

        var deleted = await service.DeleteEventAsync(10, 5, CancellationToken.None);

        Assert.False(deleted);
        _eventRepository.Verify(r => r.DeleteEventAsync(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetEventTypeMasterListAsync_ReturnsListForReadOnlyUser()
    {
        _eventRepository
            .Setup(r => r.GetEventTypeListAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new EventTypeItem { EventTypeID = 1, UnderOrgID = 1, SrNo = 1, EventType = "Meeting", IsActive = true }
            ]);
        SetupCanManageEvents(10, false);
        var service = CreateService();

        var list = await service.GetEventTypeMasterListAsync(10, 1, CancellationToken.None);

        Assert.Single(list);
        Assert.Equal("Meeting", list[0].EventType);
    }

    [Fact]
    public async Task SaveEventTypeAsync_RejectsInvalidUnderOrgId()
    {
        SetupCanManageEvents(10, true);
        var service = CreateService();

        var result = await service.SaveEventTypeAsync(10, new SaveEventTypeRequestDto
        {
            UnderOrgID = 0,
            EventType = "Meeting",
            IsActive = true
        }, CancellationToken.None);

        Assert.Null(result);
        _eventRepository.Verify(r => r.SaveEventTypeAsync(It.IsAny<SaveEventTypeEntity>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveEventTypeAsync_TrimsEventTypeBeforeSave()
    {
        SetupCanManageEvents(10, true);
        SaveEventTypeEntity? captured = null;
        _eventRepository
            .Setup(r => r.SaveEventTypeAsync(It.IsAny<SaveEventTypeEntity>(), It.IsAny<CancellationToken>()))
            .Callback<SaveEventTypeEntity, CancellationToken>((entity, _) => captured = entity)
            .ReturnsAsync(7);
        _eventRepository
            .Setup(r => r.GetEventTypeListAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new EventTypeItem { EventTypeID = 7, UnderOrgID = 1, SrNo = 2, EventType = "Sports Day", IsActive = true }]);

        var service = CreateService();
        var result = await service.SaveEventTypeAsync(10, new SaveEventTypeRequestDto
        {
            UnderOrgID = 1,
            EventType = "  Sports Day  ",
            IsActive = true
        }, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("Sports Day", captured?.EventType);
        Assert.Equal(7, result!.EventTypeID);
    }

    [Fact]
    public async Task DeleteEventTypeAsync_RejectsReadOnlyUser()
    {
        SetupCanManageEvents(10, false);
        var service = CreateService();

        var deleted = await service.DeleteEventTypeAsync(10, 3, CancellationToken.None);

        Assert.False(deleted);
        _eventRepository.Verify(r => r.DeleteEventTypeAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveEventAsync_AcceptsMultipleSchools()
    {
        SetupCanManageEvents(10, true);
        SaveEventEntity? captured = null;
        _userRepository
            .Setup(r => r.GetProfileByUserIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserProfileDetail { OrgID = 1, SchoolCode = 101 });
        _eventRepository
            .Setup(r => r.SaveEventAsync(It.IsAny<SaveEventEntity>(), It.IsAny<CancellationToken>()))
            .Callback<SaveEventEntity, CancellationToken>((entity, _) => captured = entity)
            .ReturnsAsync(42);
        _eventRepository
            .Setup(r => r.GetEventByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CalendarEventItem
            {
                EventID = 42,
                Title = "Sports Day",
                Location = "Ground",
                EventDate = DateTime.UtcNow.Date,
                Status = "नियोजित",
                OrgIDs = "1,2,3",
                SchoolNames = "School A, School B, School C"
            });

        var service = CreateService();
        var request = new SaveEventRequestDto
        {
            Title = "Sports Day",
            Location = "Auditorium",
            EventDate = DateTime.UtcNow.Date,
            Status = "नियोजित",
            OrgIDs = [1, 2, 3],
            UnderOrgID = 1
        };

        var result = await service.SaveEventAsync(10, request, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("1,2,3", captured?.OrgIDs);
        Assert.Equal(1, captured?.OrgID);
    }

    [Fact]
    public async Task SaveEventAsync_TrimsTitleAndLocation()
    {
        SetupCanManageEvents(10, true);
        SaveEventEntity? captured = null;
        _userRepository
            .Setup(r => r.GetProfileByUserIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserProfileDetail { OrgID = 1 });
        _eventRepository
            .Setup(r => r.SaveEventAsync(It.IsAny<SaveEventEntity>(), It.IsAny<CancellationToken>()))
            .Callback<SaveEventEntity, CancellationToken>((entity, _) => captured = entity)
            .ReturnsAsync(9);
        _eventRepository
            .Setup(r => r.GetEventByIdAsync(9, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CalendarEventItem { EventID = 9, Title = "Annual Day", Location = "Hall", EventDate = DateTime.UtcNow.Date });

        var service = CreateService();
        var request = new SaveEventRequestDto
        {
            Title = "  Annual Day  ",
            Location = "  Hall  ",
            EventDate = DateTime.UtcNow.Date,
            Status = "नियोजित",
            OrgIDs = [1],
            UnderOrgID = 1
        };

        var result = await service.SaveEventAsync(10, request, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("Annual Day", captured?.Title);
        Assert.Equal("Hall", captured?.Location);
    }

    [Theory]
    [MemberData(nameof(SaveEventValidationCases))]
    public async Task SaveEventAsync_HardcodedValidationMatrix(string title, string location, long[] orgIds, bool shouldSave)
    {
        SetupCanManageEvents(10, true);
        _userRepository
            .Setup(r => r.GetProfileByUserIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserProfileDetail { OrgID = 1 });
        _eventRepository
            .Setup(r => r.SaveEventAsync(It.IsAny<SaveEventEntity>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        _eventRepository
            .Setup(r => r.GetEventByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CalendarEventItem { EventID = 1, Title = title.Trim(), Location = location.Trim(), EventDate = DateTime.UtcNow.Date });

        var service = CreateService();
        var request = new SaveEventRequestDto
        {
            Title = title,
            Location = location,
            EventDate = DateTime.UtcNow.Date,
            Status = "नियोजित",
            OrgIDs = orgIds,
            UnderOrgID = 1
        };

        var result = await service.SaveEventAsync(10, request, CancellationToken.None);

        if (shouldSave)
        {
            Assert.NotNull(result);
            _eventRepository.Verify(r => r.SaveEventAsync(It.IsAny<SaveEventEntity>(), It.IsAny<CancellationToken>()), Times.Once);
        }
        else
        {
            Assert.Null(result);
            _eventRepository.Verify(r => r.SaveEventAsync(It.IsAny<SaveEventEntity>(), It.IsAny<CancellationToken>()), Times.Never);
        }
    }

    public static TheoryData<string, string, long[], bool> SaveEventValidationCases => new()
    {
        { "", "Ground", [1], false },
        { "Event", "", [1], false },
        { "Event", "Ground", [], false },
        { "  ", "Ground", [1], false },
        { "Event", "  ", [1], false },
        { "Annual Day", "Auditorium", [1, 2], true }
    };

    [Theory]
    [InlineData(0, "Meeting", false)]
    [InlineData(1, "", false)]
    [InlineData(1, "   ", false)]
    [InlineData(5, "Parent Meeting", true)]
    public async Task SaveEventTypeAsync_HardcodedValidationMatrix(long underOrgId, string eventType, bool shouldSave)
    {
        SetupCanManageEvents(10, true);
        _eventRepository
            .Setup(r => r.SaveEventTypeAsync(It.IsAny<SaveEventTypeEntity>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(11);
        _eventRepository
            .Setup(r => r.GetEventTypeListAsync(underOrgId > 0 ? underOrgId : 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new EventTypeItem { EventTypeID = 11, UnderOrgID = underOrgId, EventType = eventType.Trim(), IsActive = true }]);

        var service = CreateService();
        var result = await service.SaveEventTypeAsync(10, new SaveEventTypeRequestDto
        {
            UnderOrgID = underOrgId,
            EventType = eventType,
            IsActive = true
        }, CancellationToken.None);

        if (shouldSave)
        {
            Assert.NotNull(result);
            _eventRepository.Verify(r => r.SaveEventTypeAsync(It.IsAny<SaveEventTypeEntity>(), It.IsAny<CancellationToken>()), Times.Once);
        }
        else
        {
            Assert.Null(result);
            _eventRepository.Verify(r => r.SaveEventTypeAsync(It.IsAny<SaveEventTypeEntity>(), It.IsAny<CancellationToken>()), Times.Never);
        }
    }

    [Fact]
    public async Task DeleteEventTypeAsync_AllowsManager()
    {
        SetupCanManageEvents(10, true);
        var service = CreateService();

        var deleted = await service.DeleteEventTypeAsync(10, 3, CancellationToken.None);

        Assert.True(deleted);
        _eventRepository.Verify(r => r.DeleteEventTypeAsync(3, It.IsAny<CancellationToken>()), Times.Once);
    }

    private static SaveEventRequestDto ValidEventRequest() => new()
    {
        Title = "Annual Day",
        Location = "Auditorium",
        EventDate = DateTime.UtcNow.Date,
        Status = "नियोजित",
        OrgIDs = [1],
        UnderOrgID = 1
    };
}
