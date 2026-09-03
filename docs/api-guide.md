# SLMS Backend API Guide

## Core modules

- Authentication: `/api/auth`
- Users: `/api/users`
- Students: `/api/students`
- Admin: `/api/admin`
- Complaints: `/api/complaints`
- Requests: `/api/requests`
- Hostel: `/api/hostel`
- Expenses: `/api/expenses`
- Academic: `/api/academic`
- Fees: `/api/fees`
- Notifications: `/api/notifications`
- Files: `/api/files`
- Sessions: `/api/sessions`
- AI: `/api/ai`

## Authentication

All protected endpoints require an Authorization header in the form:

```http
Authorization: Bearer <access_token>
```

## Status codes

- 200 OK: successful read or update
- 201 Created: resource created
- 400 Bad Request: invalid payload
- 401 Unauthorized: missing/invalid JWT or expired session
- 403 Forbidden: insufficient role or permission
- 404 Not Found: record missing
- 409 Conflict: duplicate resource

## Main endpoints

### Auth

- POST `/api/auth/register` — register user
- POST `/api/auth/login` — login
- POST `/api/auth/logout` — logout current session
- POST `/api/auth/refresh-token` — refresh JWT
- GET `/api/auth/me` — current user
- POST `/api/auth/change-password` — change password
- POST `/api/auth/forgot-password` — request reset
- POST `/api/auth/reset-password` — reset password
- GET `/api/auth/history` — authenticated user's complete security history
- GET `/api/auth/login/history` — login history

### Users

- GET `/api/users/me` — current profile
- PUT `/api/users/me` — update profile
- GET `/api/users` — list users (admin only)
- DELETE `/api/users/:id` — delete user (admin only)

### Students

- GET `/api/students/dashboard` — dashboard details
- GET `/api/students/profile` — student profile
- PUT `/api/students/profile` — update profile
- GET `/api/students/list` — student list
- GET `/api/students/:id` — student details

### Admin

- GET `/api/admin/dashboard` — admin dashboard
- GET `/api/admin/users` — user directory
- GET `/api/admin/roles` — roles
- GET `/api/admin/permissions` — permissions
- GET `/api/admin/audit-logs` — audit logs

### Complaints

- GET `/api/complaints` — list complaints
- POST `/api/complaints` — create complaint
- PATCH `/api/complaints/:id/status` — admin status update
- GET `/api/complaints/:id/status-history` — status history

### Requests

- GET `/api/requests` — list requests
- POST `/api/requests` — create request
- PATCH `/api/requests/:id/status` — update request status
- GET `/api/requests/:id/status-history` — request history

### Hostel, expenses, fees

- GET `/api/hostel`
- POST `/api/hostel`
- PUT `/api/hostel/:id`
- GET `/api/expenses`
- POST `/api/expenses`
- PUT `/api/expenses/:id`
- GET `/api/fees`
- POST `/api/fees`
- PUT `/api/fees/:id`

### Notifications & files

- GET `/api/notifications`
- GET `/api/notifications/unread`
- GET `/api/notifications/count`
- PATCH `/api/notifications/:id/read`
- PATCH `/api/notifications/mark-all-read`
- GET `/api/files`
- POST `/api/files/upload`
- GET `/api/files/:id/download`
- DELETE `/api/files/:id`

### AI

- GET `/api/ai/conversations`
- POST `/api/ai/conversations`
- GET `/api/ai/conversations/:id`
- POST `/api/ai/conversations/:id/message`

## Response format

Successful responses use:

```json
{
  "success": true,
  "message": "Request processed successfully",
  "data": {}
}
```

Error responses use:

```json
{
  "success": false,
  "message": "Unauthorized",
  "errors": {}
}
```
