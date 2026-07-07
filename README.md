# SmartERP

School & Sanstha Education Management Portal — Angular frontend, .NET 9 API, SQL Server.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 19, Firebase Hosting |
| Backend | .NET 9 Web API, Cloud Run |
| Database | SQL Server (`SmartERP`) |

## Project structure

```
SmartEPR/
├── frontend/          # Angular app
├── backend/           # .NET API (SmartEPR.Api, Core, Infrastructure)
├── database/scripts/  # SQL migration & stored procedure scripts
└── firebase.json      # Firebase hosting config
```

## Local setup

### Database

Run scripts in `database/scripts/` in order (`001_` … `012_`) on your SQL Server `SmartERP` database.

### Backend

```powershell
cd backend/SmartEPR.Api
copy appsettings.example.json appsettings.json
# Edit appsettings.json with your connection string and JWT secret
dotnet run
```

API default: `http://localhost:5209`

### Frontend

```powershell
cd frontend
npm install
npm start
```

App: `http://localhost:4200`

## Modules

- Dashboard, Academic Calendar, Event Calendar
- Audit: Receipt/Payment Vouchers, Donation Entry
- Ticket Raise
- Operations & Administration (placeholders)

## Deploy

- **Frontend:** `cd frontend && npm run deploy`
- **Backend:** Docker build + Google Cloud Run (see `backend/Dockerfile`)

## Configuration

Copy example files and fill in secrets locally (never commit real passwords):

- `backend/SmartEPR.Api/appsettings.example.json` → `appsettings.json`
- `backend/cloudrun.env.example.yaml` → `cloudrun.env.yaml`
