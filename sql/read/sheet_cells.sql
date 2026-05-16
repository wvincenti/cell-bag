SELECT 
	sheet.name
	,col.name
	,col.index
	,cell.row_index
	,cell.col_index
	,cell.display_val

FROM users_sheets u_s
	INNER JOIN sheets sheet ON (sheet.id = u_s.sheet_id)
	INNER JOIN cols col ON (col.index = sheet.col_index)
	INNER JOIN cells cell ON (cell.col_index = col.index)
WHERE 
	cell.sheet_id = ? 
	AND u_s.sheet_id = ?
ORDER BY
	cell.row_id
	,cell.col_index