-- Academic & Event Calendar tables (from scheduler reference)
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

IF OBJECT_ID('dbo.EventTypes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EventTypes (
        EventTypeId   INT IDENTITY(1,1) NOT NULL,
        Code          NVARCHAR(50)  NOT NULL,
        NameEn        NVARCHAR(100) NOT NULL,
        NameMr        NVARCHAR(100) NOT NULL,
        DefaultColor  NVARCHAR(20)  NULL,
        SortOrder     INT           NOT NULL CONSTRAINT DF_EventTypes_SortOrder DEFAULT (0),
        IsActive      BIT           NOT NULL CONSTRAINT DF_EventTypes_IsActive DEFAULT (1),
        CONSTRAINT PK_EventTypes PRIMARY KEY CLUSTERED (EventTypeId),
        CONSTRAINT UQ_EventTypes_Code UNIQUE (Code)
    );
END
GO

IF OBJECT_ID('dbo.HolidayMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.HolidayMaster (
        HolidayId     INT IDENTITY(1,1) NOT NULL,
        HolidayDate   DATE          NOT NULL,
        NameMr        NVARCHAR(200) NOT NULL,
        NameEn        NVARCHAR(200) NOT NULL,
        HolidayType   NVARCHAR(30)  NOT NULL CONSTRAINT DF_HolidayMaster_HolidayType DEFAULT (N'national'),
        Color         NVARCHAR(20)  NOT NULL CONSTRAINT DF_HolidayMaster_Color DEFAULT (N'#7b1fa2'),
        Year          INT           NOT NULL,
        CONSTRAINT PK_HolidayMaster PRIMARY KEY CLUSTERED (HolidayId)
    );
    CREATE NONCLUSTERED INDEX IX_HolidayMaster_Date ON dbo.HolidayMaster (HolidayDate);
    CREATE NONCLUSTERED INDEX IX_HolidayMaster_Year ON dbo.HolidayMaster (Year);
END
GO

IF OBJECT_ID('dbo.FestivalMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FestivalMaster (
        FestivalId    INT IDENTITY(1,1) NOT NULL,
        FestivalDate  DATE          NOT NULL,
        NameMr        NVARCHAR(200) NOT NULL,
        NameEn        NVARCHAR(200) NOT NULL,
        Color         NVARCHAR(20)  NOT NULL CONSTRAINT DF_FestivalMaster_Color DEFAULT (N'#9c27b0'),
        Year          INT           NOT NULL,
        CONSTRAINT PK_FestivalMaster PRIMARY KEY CLUSTERED (FestivalId)
    );
    CREATE NONCLUSTERED INDEX IX_FestivalMaster_Date ON dbo.FestivalMaster (FestivalDate);
    CREATE NONCLUSTERED INDEX IX_FestivalMaster_Year ON dbo.FestivalMaster (Year);
END
GO

IF OBJECT_ID('dbo.Events', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Events (
        EventId           INT IDENTITY(1,1) NOT NULL,
        Title             NVARCHAR(250) NOT NULL,
        Description       NVARCHAR(MAX) NULL,
        EventDate         DATE          NOT NULL,
        StartTime         TIME(0)       NULL,
        EndTime           TIME(0)       NULL,
        IsAllDay          BIT           NOT NULL CONSTRAINT DF_Events_IsAllDay DEFAULT (0),
        EventTypeId       INT           NULL,
        Priority          NVARCHAR(20)  NOT NULL CONSTRAINT DF_Events_Priority DEFAULT (N'मध्यम'),
        Location          NVARCHAR(500) NULL,
        OrganizerUserId   BIGINT        NULL,
        OrganizerName     NVARCHAR(200) NULL,
        Color             NVARCHAR(20)  NULL,
        Status            NVARCHAR(50)  NOT NULL CONSTRAINT DF_Events_Status DEFAULT (N'नियोजित'),
        Notes             NVARCHAR(MAX) NULL,
        OrgID             INT           NULL,
        SchoolCode        BIGINT        NULL,
        CreatedByUserId   BIGINT        NULL,
        CreatedAt         DATETIME2(0)  NOT NULL CONSTRAINT DF_Events_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt         DATETIME2(0)  NULL,
        CONSTRAINT PK_Events PRIMARY KEY CLUSTERED (EventId),
        CONSTRAINT FK_Events_EventTypes FOREIGN KEY (EventTypeId) REFERENCES dbo.EventTypes (EventTypeId)
    );
    CREATE NONCLUSTERED INDEX IX_Events_EventDate ON dbo.Events (EventDate);
    CREATE NONCLUSTERED INDEX IX_Events_Status ON dbo.Events (Status);
    CREATE NONCLUSTERED INDEX IX_Events_OrgID ON dbo.Events (OrgID);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.EventTypes)
BEGIN
    INSERT INTO dbo.EventTypes (Code, NameEn, NameMr, DefaultColor, SortOrder) VALUES
    (N'public_meeting', N'Public Meeting', N'सार्वजनिक बैठक', N'#1976d2', 1),
    (N'party_meeting', N'Party Meeting', N'पक्ष बैठक', N'#1976d2', 2),
    (N'govt_program', N'Government Program', N'सरकारी कार्यक्रम', N'#1565c0', 3),
    (N'office_work', N'Office Work', N'कार्यालयीन काम', N'#455a64', 4),
    (N'constituency_visit', N'Constituency Visit', N'मतदारसंघ दौरा', N'#00897b', 5),
    (N'inspection', N'Inspection', N'तपासणी', N'#6d4c41', 6),
    (N'appointment', N'Appointment', N'भेट', N'#1976d2', 7),
    (N'phone_call', N'Phone Call', N'फोन कॉल', N'#5c6bc0', 8),
    (N'birthday', N'Birthday', N'वाढदिवस', N'#e91e63', 9),
    (N'anniversary', N'Anniversary', N'वर्धापनदिन', N'#ad1457', 10),
    (N'follow_up', N'Follow-up', N'फॉलो-अप', N'#f57c00', 11),
    (N'emergency', N'Emergency', N'आपत्कालीन', N'#c62828', 12),
    (N'assembly_session', N'Assembly Session', N'विधानसभा सत्र', N'#283593', 13),
    (N'assembly_committee', N'Committee Meeting', N'समिती बैठक', N'#3949ab', 14),
    (N'press_conference', N'Press Conference', N'पत्रकार परिषद', N'#7b1fa2', 15),
    (N'inauguration', N'Inauguration Ceremony', N'उद्घाटन समारंभ', N'#ff6f00', 16),
    (N'bhoomipujan', N'Bhoomipujan', N'भूमिपूजन / शिलान्यास', N'#e65100', 17),
    (N'grievance_camp', N'Grievance Camp', N'तक्रार निवारण शिबिर', N'#d84315', 18),
    (N'fund_distribution', N'Fund Distribution', N'निधी वितरण', N'#2e7d32', 19),
    (N'school_event', N'School Event', N'शाळा कार्यक्रम', N'#1565c0', 20),
    (N'exam', N'Examination', N'परीक्षा', N'#6a1b9a', 21),
    (N'sports_day', N'Sports Day', N'क्रीडा दिन', N'#2e7d32', 22),
    (N'parent_meeting', N'Parent Meeting', N'पालक सभा', N'#0277bd', 23),
    (N'other', N'Other', N'इतर', N'#757575', 99);
END
GO

PRINT N'Calendar tables and event types ready.';
GO
