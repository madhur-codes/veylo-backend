# Veylo — Backend

This repository contains the backend API for Veylo, a personal cloud storage application designed around Google Drive for file storage.

The backend handles authentication, user accounts, database operations, file uploads, and communication with Google services. It provides the API used by the Veylo frontend.

## Features

* User registration and login
* JWT-based authentication
* Google OAuth authentication
* Password hashing with bcrypt
* PostgreSQL database
* Prisma ORM
* File upload handling
* Google Drive integration
* User-specific file records
* Folder management
* Protected API routes

## Tech Stack

* Node.js
* Express.js
* PostgreSQL
* Prisma ORM
* Google OAuth 2.0
* Google Drive API
* JSON Web Tokens
* bcryptjs
* Multer

## Project Structure

```text
veylo-backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── middleware/
│   ├── routes/
│   ├── controllers/
│   └── ...
├── .env
├── prisma.config.ts
├── package.json
└── README.md
```

> The exact structure may change as the project continues to grow.

## Requirements

Before running the backend, make sure you have:

* Node.js
* npm
* PostgreSQL
* A Google Cloud project
* Google Drive API enabled
* Google OAuth credentials

## Installation

Clone the repository:

```bash
git clone https://github.com/madhur-codes/veylo-backend.git
```

Enter the project:

```bash
cd veylo-backend
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root.

Example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/veylo_db"

JWT_SECRET="your_jwt_secret"

GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/auth/google/callback"
```

Never commit the `.env` file to GitHub.

## Database Setup

After configuring PostgreSQL and the database URL, run the Prisma migrations:

```bash
npx prisma migrate dev
```

Generate the Prisma client:

```bash
npx prisma generate
```

## Running the Server

Start the development server:

```bash
npm run dev
```

The API will normally be available at:

```text
http://localhost:5000
```

## Google Drive Integration

Veylo uses the Google Drive API to store uploaded files.

Before using the upload functionality:

1. Create or select a project in Google Cloud.
2. Enable the Google Drive API.
3. Configure Google OAuth credentials.
4. Add the correct OAuth redirect URI.
5. Add the required credentials to `.env`.

The application should request only the Google permissions it actually needs.

## API

The backend exposes protected API endpoints for operations such as:

```text
POST   /auth/register
POST   /auth/login
GET    /auth/me

POST   /api/upload
GET    /api/files
DELETE /api/files/:id

GET    /api/folders
POST   /api/folders
DELETE /api/folders/:id
```

The available routes may change during development.

## Security

The backend uses:

* Password hashing
* JWT authentication
* Protected API routes
* Environment variables for secrets
* User-specific database records

Private credentials such as database passwords, JWT secrets, and Google OAuth secrets must never be committed to the repository.

## Development

Veylo is currently being developed as a learning and portfolio project. The backend is being built with a focus on understanding authentication, databases, REST APIs, and third-party cloud integrations.

## Author

**Madhur Tiwari**

GitHub: https://github.com/madhur-codes

---

Veylo is a personal cloud storage project built with Node.js, PostgreSQL, Prisma, and Google Drive.
