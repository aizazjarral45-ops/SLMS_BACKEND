# SLMS Backend

This backend was designed around the actual SLMS User and Admin web apps in this workspace. It centralizes authentication, student data, admin workflows, notifications, status tracking, and AI support using Node.js, Express, MongoDB, Mongoose, Socket.IO, and JWT.

## Features

- JWT authentication and refresh token handling
- Role-based and permission-based authorization
- Single active session enforcement
- MongoDB persistence for users, students, complaints, requests, payments, academic data, hostel data, expenses, notifications, and audit logs
- Socket.IO real-time notifications and admin updates
- File upload support with secure validation
- AI conversation module ready for API key configuration
- Swagger/OpenAPI docs and a Postman-friendly API structure

## Setup

1. Copy `.env.example` to `.env` and fill in your values.
2. Start MongoDB locally or connect to a MongoDB Atlas instance.
3. Install dependencies: `npm install`
4. Start the API: `npm run dev`
5. Seed demo data: `npm run seed`

## Environment

The app expects the following variables in `.env`:

- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_SECRET` (admin authentication)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_TOKEN_EXPIRES`
- `ACCESS_TOKEN_EXPIRES`
- `REFRESH_TOKEN_EXPIRES`
- `CLIENT_URL`
- `ADMIN_URL`
- `GEMINI_API_KEY` (or legacy `API_KEY`)
- `GEMINI_MODEL` (or legacy `AI_MODEL`, defaults to `gemini-3.6-flash`)

## Main API Modules

- `/api/auth`
- `/api/users`
- `/api/students`
- `/api/admin`
- `/api/requests`
- `/api/complaints`
- `/api/hostel`
- `/api/expenses`
- `/api/assignments`
- `/api/academic`
- `/api/fees`
- `/api/notifications`
- `/api/messages`
- `/api/files`
- `/api/sessions`
- `/api/status-history`
- `/api/audit-logs`
- `/api/ai`

## Notes

- The backend uses MongoDB as the single source of truth.
- Local storage is kept only for temporary client-side session convenience in the front ends; the database is the source of record.
- Admin and student requests are isolated by `userId` ownership and authorization checks.
