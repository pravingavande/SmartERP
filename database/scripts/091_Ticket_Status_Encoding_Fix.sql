-- Fix TicketStatusMaster Marathi labels (UTF-8 mojibake on live DB)
-- Run on live if Status column shows garbled text like à¤–à¥à¤²à¥‡

UPDATE dbo.TicketStatusMaster SET StatusName = N'Open', StatusNameMr = N'खुले', SortOrder = 1 WHERE TicketStatusID = 1;
UPDATE dbo.TicketStatusMaster SET StatusName = N'Waiting for Reply', StatusNameMr = N'प्रत्युत्तराची वाट', SortOrder = 2 WHERE TicketStatusID = 2;
UPDATE dbo.TicketStatusMaster SET StatusName = N'Replied', StatusNameMr = N'उत्तर दिले', SortOrder = 3 WHERE TicketStatusID = 3;
UPDATE dbo.TicketStatusMaster SET StatusName = N'Closed', StatusNameMr = N'बंद', SortOrder = 4 WHERE TicketStatusID = 4;
GO
