-- Fix TicketStatusMaster Marathi labels (encoding corruption)
USE SmartERP;
GO

UPDATE dbo.TicketStatusMaster SET StatusNameMr = N'प्रलंबित' WHERE TicketStatusID = 1;
UPDATE dbo.TicketStatusMaster SET StatusNameMr = N'प्रगतीत' WHERE TicketStatusID = 2;
UPDATE dbo.TicketStatusMaster SET StatusNameMr = N'पूर्ण' WHERE TicketStatusID = 3;
UPDATE dbo.TicketStatusMaster SET StatusNameMr = N'रद्द' WHERE TicketStatusID = 4;
GO
