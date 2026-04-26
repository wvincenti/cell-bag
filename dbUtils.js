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
  // WRITE
  insertIgnoreSheet: readQuery("sql/write", "insertignore_sheet.sql"),
  insertIgnoreCol: readQuery("sql/write", "insertignore_col.sql"),
  upsertSheetRows: readQuery("sql/write", "upsert_sheet_rows.sql"),
  upsertUserSheet: readQuery("sql/write", "upsert_user_sheet.sql"),
  upsertCells: readQuery("sql/write", "upsert_cells.sql"),
  upsert_cellvalues: readQuery("sql/write", "upsert_cell_values.sql"),
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
      if (conn) conn.release();
    }
  },
};
