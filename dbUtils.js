const fs = require('fs');
const path = require('path');

const readQuery = (folderName, fileName) => {
    const filePath = path.join(__dirname, folderName, fileName);
    return fs.readFileSync(filePath, 'utf8');
}

const queries = {

    readCells: readQuery('sql/read', 'sheet_cells.sql'),
    readSheets: readQuery('sql/read', 'sheets.sql'),

    insertIgnoreSheet: readQuery('sql/write', 'insertignore_sheet.sql' ),
    insertIgnoreCol: readQuery('sql/write', 'insertignore_col.sql'),
    upsertCells: readQuery('sql/write', 'upsert_cells.sql'),
    upsertCellValues: readQuery('sql/write', 'upsert_cellvalues.sql'),

}

module.exports = queries;