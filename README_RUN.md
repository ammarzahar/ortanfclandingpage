Run the local Ortan league server (serves static files + simple API)

Prerequisites: Node.js 14+ and npm installed.

Install and start:

```powershell
cd c:\Users\ammar\.gemini\antigravity\scratch\ortan-fc-landing
npm install
npm start
```

- Open `http://localhost:3000/liga-updates.html` to view the leaderboards.
- Open `http://localhost:3000/admin.html` to post match results (this will update `data/leaderboards.json`).

Notes:
- This is a simple local server for admin/testing. For production, move data to a proper DB and secure the admin endpoint.

Optional: enable Basic auth for admin endpoints

Set environment variables before starting the server to require Basic authentication for POSTing results:

```powershell
# Windows PowerShell example
$env:ADMIN_USER = 'admin'
$env:ADMIN_PASS = 's3cr3t'
npm start
```

When `ADMIN_USER`/`ADMIN_PASS` are set the `/api/result` endpoint will require HTTP Basic Auth. Use the same credentials in `admin.html` login box.
