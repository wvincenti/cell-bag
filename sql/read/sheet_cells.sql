SELECT 
	sheet.name
	,col.name
	,col.index
	,cell.row_index
	,cell.col_id
	,cell.data_type
	,cell.display_val

FROM user_sheets u_s
	INNER JOIN sheets sheet ON (sheet.id = u_s.sheet_id)
	INNER JOIN cols col ON (col.id = sheet.col_id)
	INNER JOIN cells cell ON (cell.col_id = col.id)
WHERE 
	cell.sheet_id = ? 
	AND u_s.sheet_id = ?
ORDER BY
	cell.row_id
	,cell.col_id