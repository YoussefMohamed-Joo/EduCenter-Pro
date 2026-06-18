import initSqlJs from 'sql.js';
import fs from 'fs';

const dbPath = 'C:\\Users\\yousef\\AppData\\Roaming\\educenter-pro\\educenter-pro.db';

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file) => 'node_modules/sql.js/dist/' + file
  });
  
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);
  
  const result = db.exec("SELECT id, username, password, full_name, role FROM staff");
  console.log("Staff table:", JSON.stringify(result, null, 2));
  
  // Also check settings
  const settings = db.exec("SELECT * FROM settings");
  console.log("Settings:", JSON.stringify(settings, null, 2));
  
  db.close();
}

main().catch(console.error);
