# E-Learning Platform

School-focused full-stack learning platform built with React, Express, SQLite, Sequelize, JWT, Tailwind CSS, and Multer.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, React Query, Axios
- Backend: Node.js, Express, SQLite, Sequelize, JWT, Multer, bcryptjs
- Testing: Vitest, React Testing Library, Jest, Supertest

## Project Structure

```text
E-Learning Platform/
├── backend/
│   ├── src/
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   ├── tests/
│   └── package.json
└── README.md
```

## Setup

1. Clone the repository and move into the project:
   `git clone <your-repo-url>`
   `cd "E-Learning Platform"`

2. Install backend dependencies:
   `cd backend`
   `npm install`

3. Configure backend environment in `backend/.env`:

```env
# App
PORT=5001
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
UPLOAD_DIR=uploads

# Auth
JWT_SECRET=replace_this_with_a_long_random_secret
JWT_EXPIRES_IN=7d

# Primary runtime database
DB_DIALECT=sqlite
SQLITE_STORAGE=./data/elearning.sqlite

# Optional runtime Postgres settings
# Only used if DB_DIALECT=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=elearning_db
# DB_USER=postgres
# DB_PASSWORD=yourpassword

# One-time source database for:
# npm run db:migrate:postgres-to-sqlite
SOURCE_PG_HOST=localhost
SOURCE_PG_PORT=5432
SOURCE_PG_NAME=elearning_db
SOURCE_PG_USER=postgres
SOURCE_PG_PASSWORD=yourpassword
```

4. Sync and seed the SQLite database:
   `npm run db:sync`
   `npm run seed`

5. If you need to import existing PostgreSQL data into SQLite:
   `npm run db:migrate:postgres-to-sqlite`

6. Start the backend:
   `npm run dev`

7. In a new terminal, install frontend dependencies:
   `cd ../frontend`
   `npm install`

8. Configure frontend environment in `frontend/.env`:

```env
VITE_API_URL=http://localhost:5001/api
```

9. Start the frontend:
   `npm run dev`

## Test Commands

- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm test`
- Frontend production build: `cd frontend && npm run build`

## Seeded Credentials

- Admin: `admin@school.com` / `Admin123!`
- Teacher: `teacher@school.com` / `Teacher123!`
- Student 1: `student1@school.com` / `Student123!`
- Student 2: `student2@school.com` / `Student123!`

## API Summary

| Area | Example Endpoints |
| --- | --- |
| Health | `GET /api/health` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Admin | `GET /api/admin/users`, `PUT /api/admin/users/:id/role`, `GET /api/admin/stats` |
| Courses | `POST /api/courses`, `GET /api/courses`, `GET /api/courses/:id`, `PUT /api/courses/:id/publish` |
| Content | `POST /api/courses/:courseId/sections`, `POST /api/sections/:sectionId/lessons`, `POST /api/lessons/:lessonId/materials` |
| Enrollment | `POST /api/courses/:id/enroll`, `DELETE /api/courses/:id/enroll`, `GET /api/courses/:id/students` |
| Assignments | `POST /api/courses/:courseId/assignments`, `POST /api/assignments/:id/submit`, `PUT /api/submissions/:id/grade` |
| Quizzes | `POST /api/courses/:courseId/quizzes`, `POST /api/quizzes/:id/attempt`, `GET /api/quizzes/:id/results` |
| Progress | `GET /api/student/dashboard`, `GET /api/teacher/dashboard`, `GET /api/courses/:id/progress` |
| Notifications | `GET /api/notifications`, `GET /api/notifications/count`, `PUT /api/notifications/read-all` |

## Notes

- Runtime data is stored in `backend/data/elearning.sqlite`.
- Uploaded files are served from `/uploads`.
- Auth routes and API routes are rate-limited in development and production.
- The frontend uses polling for notifications every 30 seconds.
