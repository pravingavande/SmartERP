-- Fix EventTypes Marathi names (UTF-8 encoding correction)
-- Run with: sqlcmd ... -f 65001 -i 011_EventTypes_Marathi_Fix.sql

USE SmartERP;
GO

UPDATE dbo.EventTypes SET NameMr = N'सार्वजनिक बैठक' WHERE Code = N'public_meeting';
UPDATE dbo.EventTypes SET NameMr = N'पक्ष बैठक' WHERE Code = N'party_meeting';
UPDATE dbo.EventTypes SET NameMr = N'सरकारी कार्यक्रम' WHERE Code = N'govt_program';
UPDATE dbo.EventTypes SET NameMr = N'कार्यालयीन काम' WHERE Code = N'office_work';
UPDATE dbo.EventTypes SET NameMr = N'मतदारसंघ दौरा' WHERE Code = N'constituency_visit';
UPDATE dbo.EventTypes SET NameMr = N'तपासणी' WHERE Code = N'inspection';
UPDATE dbo.EventTypes SET NameMr = N'भेट' WHERE Code = N'appointment';
UPDATE dbo.EventTypes SET NameMr = N'फोन कॉल' WHERE Code = N'phone_call';
UPDATE dbo.EventTypes SET NameMr = N'वाढदिवस' WHERE Code = N'birthday';
UPDATE dbo.EventTypes SET NameMr = N'वर्धापनदिन' WHERE Code = N'anniversary';
UPDATE dbo.EventTypes SET NameMr = N'फॉलो-अप' WHERE Code = N'follow_up';
UPDATE dbo.EventTypes SET NameMr = N'आपत्कालीन' WHERE Code = N'emergency';
UPDATE dbo.EventTypes SET NameMr = N'विधानसभा सत्र' WHERE Code = N'assembly_session';
UPDATE dbo.EventTypes SET NameMr = N'समिती बैठक' WHERE Code = N'assembly_committee';
UPDATE dbo.EventTypes SET NameMr = N'पत्रकार परिषद' WHERE Code = N'press_conference';
UPDATE dbo.EventTypes SET NameMr = N'उद्घाटन समारंभ' WHERE Code = N'inauguration';
UPDATE dbo.EventTypes SET NameMr = N'भूमिपूजन / शिलान्यास' WHERE Code = N'bhoomipujan';
UPDATE dbo.EventTypes SET NameMr = N'तक्रार निवारण शिबिर' WHERE Code = N'grievance_camp';
UPDATE dbo.EventTypes SET NameMr = N'निधी वितरण' WHERE Code = N'fund_distribution';
UPDATE dbo.EventTypes SET NameMr = N'शाळा कार्यक्रम' WHERE Code = N'school_event';
UPDATE dbo.EventTypes SET NameMr = N'परीक्षा' WHERE Code = N'exam';
UPDATE dbo.EventTypes SET NameMr = N'क्रीडा दिन' WHERE Code = N'sports_day';
UPDATE dbo.EventTypes SET NameMr = N'पालक सभा' WHERE Code = N'parent_meeting';
UPDATE dbo.EventTypes SET NameMr = N'इतर' WHERE Code = N'other';
GO

PRINT N'EventTypes Marathi names updated.';
GO
