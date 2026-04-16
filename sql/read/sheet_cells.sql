select
	c.sheet_id 
	,c.row_id
	,c.col_id
	,c.data_type
	,c.display_val 
	
from cell_master.cells c

where c.sheet_id = ?

order by
	c.row_id
	,c.col_id