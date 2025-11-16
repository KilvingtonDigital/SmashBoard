# SmashBoard Backend API

Node.js + Express + PostgreSQL backend for SmashBoard tournament management system.

## Features

- ✅ User authentication with JWT tokens
- ✅ Secure password hashing with bcrypt
- ✅ PostgreSQL database with user/tournament/player tables
- ✅ RESTful API endpoints
- ✅ CORS enabled for frontend access
- ✅ Input validation with express-validator
- ✅ Security headers with Helmet

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Tournaments
- `POST /api/tournaments` - Create tournament (protected)
- `GET /api/tournaments` - Get all user's tournaments (protected)
- `GET /api/tournaments/:id` - Get single tournament (protected)
- `PUT /api/tournaments/:id` - Update tournament (protected)
- `DELETE /api/tournaments/:id` - Delete tournament (protected)

### Players
- `POST /api/players` - Create player (protected)
- `POST /api/players/bulk` - Bulk create players (protected)
- `GET /api/players` - Get all user's players (protected)
- `GET /api/players/:id` - Get single player (protected)
- `PUT /api/players/:id` - Update player (protected)
- `DELETE /api/players/:id` - Delete player (protected)

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Database Setup

```bash
# Create database
psql postgres
CREATE DATABASE smashboard;
\q

# Run migrations
npm run migrate
```

### Development

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

Server runs on `http://localhost:5000` by default.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/smashboard` |
| `JWT_SECRET` | Secret key for JWT signing | `random-secret-string` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database and configuration
│   │   ├── database.js  # PostgreSQL connection
│   │   ├── schema.sql   # Database schema
│   │   └── migrate.js   # Migration script
│   ├── controllers/     # Request handlers
│   │   ├── authController.js
│   │   ├── tournamentController.js
│   │   └── playerController.js
│   ├── middleware/      # Custom middleware
│   │   └── auth.js      # JWT authentication
│   ├── models/          # Database models
│   │   ├── User.js
│   │   ├── Tournament.js
│   │   └── Player.js
│   ├── routes/          # API routes
│   │   ├── auth.js
│   │   ├── tournaments.js
│   │   └── players.js
│   └── server.js        # Express app entry point
├── package.json
└── README.md
```

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - Unique email
- `password_hash` - Bcrypt hashed password
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Tournaments Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `tournament_name` - Tournament name
- `tournament_type` - Type (Round Robin, Single Elimination, etc.)
- `num_courts` - Number of courts
- `tournament_data` - JSONB field for full tournament state
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Players Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `player_name` - Player name
- `dupr_rating` - DUPR skill rating (0-10)
- `gender` - Gender
- `created_at` - Timestamp

## Security

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens with 7-day expiration
- Helmet.js for security headers
- Input validation on all endpoints
- SQL injection prevention with parameterized queries
- CORS configured for specific frontend URL

## Testing

Test the API using curl or Postman:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get current user (use token from login response)
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) in the root directory for detailed deployment instructions to Railway.

## License

MIT
