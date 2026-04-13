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

# One-time source database for:
# npm run db:migrate:postgres-to-sqlite
```

4. Create a fresh empty SQLite database:
   `npm run db:sync`

5. Start the backend:
   `npm run dev`

6. In a new terminal, install frontend dependencies:
   `cd ../frontend`
   `npm install`

7. Configure frontend environment in `frontend/.env`:

```env
VITE_API_URL=http://localhost:5001/api
```

8. Start the frontend:
   `npm run dev`

## Fresh Data Workflow

Use this flow when handing the project to a client who should start with their own data instead of demo data.

1. Do not run `npm run seed`.
2. Run only:
   `cd backend`
   `npm run db:sync`
   `npm run dev`
3. Start the frontend:
   `cd ../frontend`
   `npm install`
   `npm run dev`
4. Open the app and register users normally from the UI.
5. Create real courses, lessons, assignments, quizzes, and enrollments from the app after the required roles are assigned.

Important limitation:
- Public registration currently creates `student` accounts only.
- To create the first `teacher` or `admin`, first register the user, then update that user's `role` in the SQLite database.

Example role updates in SQLite:

```sql
UPDATE users SET role = 'admin' WHERE email = 'owner@example.com';
UPDATE users SET role = 'teacher' WHERE email = 'teacher@example.com';
```

You can run those with any SQLite tool, such as DB Browser for SQLite, against `backend/data/elearning.sqlite`.

## Reset To Empty Data

To start over with a completely fresh database:

1. Stop the backend.
2. Delete `backend/data/elearning.sqlite`.
3. Run `cd backend && npm run db:sync`.

## Optional Demo Data

If you want demo content for development or presentations, you can still use:

```bash
cd backend
npm run seed
```

## Optional PostgreSQL Import

If you ever need to import an existing PostgreSQL database into SQLite:

1. Fill in the `SOURCE_PG_*` values in `backend/.env`.
2. Run:
   `cd backend && npm run db:migrate:postgres-to-sqlite`

## Test Commands

- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm test`
- Frontend production build: `cd frontend && npm run build`

## Demo Seeded Credentials

Only available if you run `npm run seed`.

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
