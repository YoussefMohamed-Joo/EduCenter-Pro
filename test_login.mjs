import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file) => 'node_modules/sql.js/dist/' + file
  });

  // Check all possible db locations
  const locations = [
    'C:\\Users\\yousef\\AppData\\Roaming\\educenter-pro\\educenter-pro.db',
    'C:\\Users\\yousef\\AppData\\Roaming\\com.educenter.pro\\educenter-pro.db',
    'C:\\Users\\yousef\\AppData\\Roaming\\EduCenter Pro\\educenter-pro.db',
    'C:\\Users\\yousef\\AppData\\Local\\Programs\\EduCenter Pro\\educenter-pro.db',
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      console.log(`\n=== DB FOUND: ${loc} ===`);
      const buf = fs.readFileSync(loc);
      const db = new SQL.Database(buf);
      try {
        const staff = db.exec("SELECT id, username, password, role, permissions FROM staff");
        console.log('Staff:', JSON.stringify(staff, null, 2));
      } catch(e) {
        console.log('Error reading staff:', e.message);
      }
      db.close();
    } else {
      console.log(`NOT FOUND: ${loc}`);
    }
  }
}
main().catch(console.error);
