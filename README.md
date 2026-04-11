# E-Learning Platform

School-focused full-stack learning platform built with React, Express, PostgreSQL, Sequelize, JWT, Tailwind CSS, and Multer.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, React Query, Axios
- Backend: Node.js, Express, PostgreSQL, Sequelize, JWT, Multer, bcryptjs
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

3. Configure backend environment in [`backend/.env`](/Users/hanan/Documents/E-Learning%20Platform/backend/.env):

```env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=elearning_db
DB_USER=postgres
DB_PASSWORD=yourpassword
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
```

4. Sync and seed the database:
   `npm run db:sync`
   `npm run seed`

5. Start the backend:
   `npm run dev`

6. In a new terminal, install frontend dependencies:
   `cd ../frontend`
   `npm install`

7. Configure frontend environment in [`frontend/.env`](/Users/hanan/Documents/E-Learning%20Platform/frontend/.env):

```env
VITE_API_URL=http://localhost:5001/api
```

8. Start the frontend:
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

- Uploaded files are served from `/uploads`.
- Auth routes and API routes are rate-limited in development and production.
- The frontend uses polling for notifications every 30 seconds.
