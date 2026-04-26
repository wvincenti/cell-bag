INSERT INTO sheet_rows (sheet_id, index)
VALUES(?,?) ON DUPLICATE KEY
UPDATE
    sheet_id = VALUES(sheet_id)
    ,index = VALUES(index);
    