const fs = require("fs");
const path = require("path");
const dns = require("dns/promises");
const mariadb = require("mariadb");

const readQuery = (folderName, fileName) => {
  const filePath = path.join(__dirname, folderName, fileName);
  return fs.readFileSync(filePath, "utf8");
};

// Database Connection Pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

const queries = {
  // READ
  readCells: readQuery("sql/read", "sheet_cells.sql"),
  readSheets: readQuery("sql/read", "sheets.sql"),
  readUserSheet: readQuery("sql/read", "user_sheet.sql"),
  checkSheetWritePermission: readQuery(
    "sql/read",
    "check_sheet_write_permission.sql",
  ),
  checkSheetReadPermission: readQuery(
    "sql/read",
    "check_sheet_read_permission.sql",
  ),

  // WRITE
  insertSheet: readQuery("sql/write", "insert_sheet.sql"),
  upsertSheetCols: readQuery("sql/write", "upsert_sheet_cols.sql"),
  insertIgnoreSheetRows: readQuery("sql/write", "insertignore_sheet_rows.sql"),

  upsertUserSheet: readQuery("sql/write", "upsert_user_sheet.sql"),
  upsertCells: readQuery("sql/write", "upsert_cells.sql"),
  upsertCellValues: readQuery("sql/write", "upsert_cell_values.sql"),

  updateSheet: readQuery("sql/write", "update_sheet.sql"),

  // DELETE
  deleteCellValues: readQuery("sql/delete", "delete_cell_values.sql"),
  deleteCells: readQuery("sql/delete", "delete_cells.sql"),
  deleteEmptyRows: readQuery("sql/delete", "delete_empty_rows.sql"),
  deleteEmptyCols: readQuery("sql/delete", "delete_empty_cols.sql"),
  deleteSheet: readQuery("sql/delete", "delete_sheet.sql"),
};

module.exports = {
  pool,
  queries,
  async isEmailDomainValid(email) {
    const domain = email.split("@")[1];
    try {
      const mxRecords = await dns.resolveMx(domain);
      // If it has MX records and the array isn't empty, the domain can receive mail
      return mxRecords && mxRecords.length > 0;
    } catch (error) {
      // dns.resolveMx throws an error if no records are found (ENODATA or ENOTFOUND)
      console.log(error);
      return false;
    }
  },

  /**
   * Higher-order function to handle DB transactions safely.
   * @param {Function} action - The async logic to run inside the transaction.
   * @param {Object} res - The Express response object to handle errors.
   */

  async withTransaction(res, action) {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // Run the actual logic and pass the connection to it
      const result = await action(conn);

      await conn.commit();
      return result;
    } catch (err) {
      if (conn) await conn.rollback();
      console.error("Database Error:", err);
      throw err; // Re-throw so the route knows it failed
    } finally {
      if (conn) {
        try {
          await conn.release();
        } catch (releaseErr) {
          console.error("Pool release failed: ", releaseErr);
        }
      }
    }
  },

  createSheetMeta(dbRows) {
    return dbRows.reduce((acc, row) => {
      let sheet = acc.find((s) => s.id == row.sheet_id);

      if (!sheet) {
        sheet = {
          id: Number(row.sheet_id),
          name: row.sheet_name,
          index: null,
          permission: row.permission,
          visibility: row.visibility,
          updated_at: row.updated_at,
          isDirty: false,
          cols: [],
        };
        acc.push(sheet);
      }

      sheet.cols.push({
        name: row.column_name,
        col_index: row.column_index,
        data_type: row.data_type,
        isDirty: false,
        isNew: false,
      });

      return acc;
    }, []);
  },
};
