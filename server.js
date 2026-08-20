const express = require("express");
const dns = require("dns/promises");

const mariadb = require("mariadb");
const cors = require("cors");

const bcrypt = require("bcrypt");
const crypto = require("crypto");

const session = require("express-session");
const FileStore = require("session-file-store")(session);

require("dotenv").config();
const {
  queries,
  isEmailDomainValid,
  withTransaction,
  createSheetMeta,
} = require("./dbUtils");
const { permission } = require("process");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
console.log("session SECRET: " + process.env.SESSION_SECRET);
// const dynamicSecret = crypto.randomBytes(32).toString("hex");
// console.log(
//   `[Server] Booting up with Secret Key: ${dynamicSecret.substring(0, 8)}...`,
// );

app.use(
  session({
    // Using our freshly minted key
    secret: process.env.SESSION_SECRET,

    store: new FileStore({
      path: "./sessions",
      // Optional: clear expired sessions on boot
      reapInterval: 3600,
    }),

    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: false, // Set to true if you move to HTTPS!
      sameSite: "lax",
    },
  }),
);

// 2. The Global Check (Must come second)
app.use((req, res, next) => {
  // List of routes that DON'T need a login (whitelist)
  console.log(req.path);

  const publicRoutes = ["/api/login", "/api/register", "/api/public"];

  if (publicRoutes.includes(req.path)) {
    return next(); // Let them through to the login page!
  }
  // Check the session file for the user_id
  if (req.session.user_id) {
    console.log(`User ${req.session.user_id} is authenticated.`);
    next(); // Math/Signature/File all matched! Proceed to the route.
  } else {
    console.log("No valid session found. Redirecting...");
    res.status(401).json({ message: "Session expired" });
  }
});

app.get("/api/session", (req, res) => {
  console.log("SESSION");
  console.log(req.session);
  if (req.session.user_id) {
    res.json({
      isAuthenticated: true,
      user_id: req.session.user_id,
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

//#region READ CELLS
// GET: Fetch all cells for a specific sheet
app.get("/api/cells/:sheetId", async (req, res) => {
  console.log("request recieved");

  //let sheetData;
  let cellData;

  await withTransaction(res, async (conn) => {
    const hasPermission = await conn.execute(queries.checkSheetReadPermission, [
      req.params.sheetId,
      req.session.user_id,
    ]);

    if (hasPermission) {
      //sheetData = await conn.execute(queries.readUserSheet, req.params.sheetId);
      cellData = await conn.execute(queries.readCells, req.params.sheetId);

      // cellData = cellData.reduce((acc, current) => {

      //   if (!acc[current.row_index]) acc[current.row_index] = {}

      //   acc[current.row_index][current.col_index] = current;

      //   return acc
      // }, {})
    } else {
      return res
        .staus(403)
        .send(
          "Requested sheet doesn't exist or don't have permission to read it.",
        );
    }
  });

  //const sheet_meta = createSheetMeta(sheetData);

  // const cells = cellData.map((cell) => {
  //   return {
  //     cell_value: cell.display_val,
  //     old_value: cell.display_val,
  //     row_index: Number(cell.row_index),
  //     col_index: cell.col_index,
  //     sheet_id: Number(cell.sheet_id),
  //     data_type: cell.data_type,
  //     isDirty: false,
  //   };
  // });

  // console.log("sheet and cells ok");
  // console.log(sheet_meta);
  return res.status(200).json(cellData);
});
//#endregion

//#region SHEET SCHEMA
app.get("/api/db", async (req, res) => {
  console.log("read sheets request recieved");
  const dbRows = await withTransaction(res, async (conn) => {
    //return
    const sheetData = await conn.execute(
      queries.readSheets,
      req.session.user_id,
    );

    const connectionData = await conn.execute(
      queries.readSheetConnections,
      req.session.user_id,
    );

    console.log("SHEET DATA ****");
    console.log(sheetData);

    return { connectionData, sheetData };
  });

  const sheets = createSheetMeta(dbRows.sheetData);
  console.log("CONNECTION DATA");
  console.log(dbRows.connectionData);

  // update using a map containing a set
  sheets.forEach((sheet) => {
    dbRows.connectionData.forEach((connection) => {
      if (sheet.id == connection.sheet_a) {
        sheet.linked_sheet_ids.push(connection.sheet_b);
      } else if (sheet.id == connection.sheet_b) {
        sheet.linked_sheet_ids.push(connection.sheet_a);
      }
    });
  });

  console.log(sheets);

  res.json(sheets); // This is the response.data Pinia receives
});
//#endregion

//#region SIGNING USER
// ** SIGN UP **
app.post("/api/register", async (req, res) => {
  try {
    let { email, username, password } = req.body;

    if (!email.includes("@"))
      return res.status(400).json({
        message: `Invalid email format for email: ${email}`,
      });

    const isValidDomain = await isEmailDomainValid(email);

    console.log("Email domain valid: " + isValidDomain);

    if (!isValidDomain)
      return res.status(400).send(`${email} doesn't seem to exist`);

    username = username || email;

    const saltRounds = 10;

    const hash = await bcrypt.hash(password, saltRounds);

    const dbRes = await withTransaction(res, async (conn) => {
      const sqlRes = await conn.query(
        "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)",
        [email, username, hash],
      );

      console.log("sql response:");
      console.log(sqlRes);

      return sqlRes;
    });

    console.log(dbResponse);
    const userId = Number(dbResponse);

    // SAVE TO SIGNED COOKIE SESSION
    req.session.user_id = userId;
    return res.send("Logged in!");
  } catch (ex) {
    console.log(ex);
  }
});

// *** LOG IN ***
app.post("/api/login", async (req, res) => {
  console.log(req.body);

  const { email, password } = req.body;

  try {
    const rows = await withTransaction(res, async (conn) => {
      const user = await conn.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);
      return user;
    });
    console.log(rows);
    if (rows.length > 0) {
      const user = rows[0];
      // Compare the login password with the hash in the DB
      const match = await bcrypt.compare(password, user.password_hash);
      console.log(match);
      if (match) {
        // SAVE TO SIGNED COOKIE SESSION
        console.log(req.session);
        req.session.user_id = Number(user.id);
        console.log(req.session);
        return res.send({
          message: "Logged in!",
          user_id: req.session.user_id,
        });
      }

      res.status(401).send("Invalid email or password.");
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send("Could not log out");
    res.clearCookie("connect.sid"); // Clear the session cookie
    return res.status(200).send("OK");
  });
});
//#endregion

//#region SAVE CELLS
// POST: Update or Insert a cell
app.post("/api/cells/saveCells", async (req, res) => {
  try {
    console.log("save request recieved");
    console.log(req.body);
    const { cells, sheet_meta, deleted_cells } = req.body;
    console.log(sheet_meta);
    console.log(cells);
    console.log(sheet_meta.cols);

    // const sheetRows = [...req.body.rows];

    withTransaction(res, async (conn) => {
      let hasPermission = false;

      // checks if sheet is new or existing
      if (!Number.isInteger(sheet_meta.id)) {
        const rows = await conn.execute(queries.insertSheet, [
          sheet_meta.name,
          sheet_meta.visibility,
        ]);

        const id = rows[0].id;

        await conn.execute(queries.upsertUserSheet, [
          req.session.user_id,
          id,
          sheet_meta.permission,
        ]);

        sheet_meta.id = id;

        hasPermission = true;
      } else if (sheet_meta.isDirty) {
        hasPermission = conn.execute(queries.checkSheetWritePermission, [
          sheet_meta.id,
          req.session.user_id,
        ]);

        if (hasPermission) {
          await conn.execute(queries.updateSheet, [
            sheet_meta.name,
            sheet_meta.visibility,
            sheet_meta.id,
            req.session.user_id,
          ]);
        }
      }

      if (hasPermission && sheet_meta.cols.length > 0) {
        const colValues = sheet_meta.cols.map((col) => {
          return [sheet_meta.id, col.col_index, col.name, col.data_type];
        });

        await conn.batch(queries.upsertSheetCols, colValues);
      }
      console.log(sheet_meta.rows);
      if (hasPermission && [...sheet_meta?.rows].length > 0) {
        const rowValues = sheet_meta.rows.map((rowIdx) => {
          return [sheet_meta.id, rowIdx];
        });

        await conn.batch(queries.insertIgnoreSheetRows, rowValues);
      }

      if (hasPermission && cells.length > 0) {
        const { cellMeta, cellValues } = cells.reduce(
          (acc, cell) => {
            acc.cellMeta.push([
              sheet_meta.id,
              cell.row_index,
              cell.col_index,
              cell.cell_value,
              // req.session.user_id,
              // sheet_meta.id,
            ]);

            acc.cellValues.push([
              sheet_meta.id,
              cell.row_index,
              cell.col_index,
              cell.data_type,
              cell.data_type,
              cell.cell_value,
              cell.data_type,
              cell.cell_value,
              cell.data_type,
              cell.cell_value,
              cell.data_type,
              cell.cell_value,
              cell.data_type,
              cell.cell_value,
              cell.data_type,
              cell.cell_value,
              cell.data_type,
              cell.cell_value,
            ]);

            return acc;
          },
          { cellMeta: [], cellValues: [] },
        );

        await conn.batch(queries.upsertCells, cellMeta);

        await conn.batch(queries.upsertCellValues, cellValues);
      }

      if (hasPermission && deleted_cells.length > 0) {
        const deleteValues = deleted_cells.map((cell) => {
          return [sheet_meta.id, cell.row_index, cell.col_index];
        });

        await conn.batch(queries.deleteCellValues, deleteValues);

        await conn.batch(queries.deleteCells, deleteValues);

        await conn.execute(queries.deleteEmptyRows, [sheet_meta.id]);

        await conn.execute(queries.deleteEmptyCols, [sheet_meta.id]);
      }

      if (hasPermission && sheet_meta.linked_sheet_ids.length > 0) {
        const links = sheet_meta.linked_sheet_ids.map((linkedId) => {
          if (sheet_meta.id != linkedId) {
            return sheet_meta.id < linkedId
              ? [sheet_meta.id, linkedId]
              : [linkedId, sheet_meta.id];
          }
        });

        await conn.batch(queries.insertIgnoreSheetConnections, links);
      }

      if (hasPermission && sheet_meta?.deleted_links?.length > 0) {
        const links = sheet_meta.delete_links.map((linkedId) => {
          if (sheet_meta.id != linkedId) {
            return sheet_meta.id < linkedId
              ? [sheet_meta.id, linkedId]
              : [linkedId, sheet_meta.id];
          }
        });

        await conn.batch(queries.deleteSheetConnections, links);
      }

      return res.status(200).send(Number(sheet_meta.id));
    });
  } catch (ex) {
    console.log(ex);
    return res.status(500).send("Error processing the request");
  }
});
//#endregion

//#region DELETE CELLS
app.post("/api/deleteSheet", async (req, res) => {
  try {
    let { sheet_id } = req.body;

    sheet_id = Number(sheet_id);

    if (!sheet_id) return res.status(400).send("Missing sheet id");

    console.log(sheet_id);

    withTransaction(res, async (conn) => {
      await conn.execute(queries.deleteSheet, [sheet_id]);
    });

    res.status(200).send(`Sheet ${sheet_id} deleted`);
  } catch (ex) {
    console.log(ex);
    return res.status(500).send("Error processing the request");
  }
});
//#endregion

app.post("/api/updateName", async (req, res) => {
  console.log("updating name");
  const sheetId = req.body.sheet_id;
  const newName = req.body.new_name;
  const tableName = req.body.table_name;

  console.log(req.body);

  // 1. Define the "Safe List"
  const allowedTables = ["sheets", "columns", "cell_data"];

  // 2. The Check
  if (!allowedTables.includes(tableName)) {
    // Log the attempt for security monitoring
    console.warn(
      `Security Alert: Unauthorized table access attempt: ${tableName}`,
    );
    return res.status(403).json({ error: "Invalid table name" });
  }

  let conn;
  try {
    console.log("starting db connection");
    conn = await pool.getConnection();
    await conn.query("UPDATE " + tableName + " SET name = ? WHERE id = ?", [
      newName,
      sheetId,
    ]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err);
  } finally {
    if (conn) conn.release();
  }
});

app.listen(process.env.PORT, () =>
  console.log("Backend running on localhost:" + process.env.PORT),
);
