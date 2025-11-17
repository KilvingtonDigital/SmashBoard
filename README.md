# SmashBoard 🏓

**Professional Pickleball Tournament Management System**

A full-stack Progressive Web App (PWA) for managing pickleball tournaments with user authentication, cloud storage, and advanced scheduling algorithms.

![SmashBoard](https://img.shields.io/badge/React-19.1.1-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue)
![PWA](https://img.shields.io/badge/PWA-Enabled-purple)

## Features

### 🎯 Tournament Management
- **Multiple Tournament Types**:
  - Round Robin scheduling
  - Single Elimination brackets
  - Swiss System
  - Pool → Bracket conversion
  - King of Court format

### 📊 Intelligent Scheduling
- DUPR-based skill matching
- 7-tier difficulty levels (Beginner to Expert Pro)
- Fair player distribution across courts
- Prevents duplicate team pairings
- Automatic sit-out fairness validation

### 👥 User Authentication
- ✅ Secure user registration with email validation
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Multi-device access with cloud sync
- ✅ Auto-migration from localStorage to cloud

### 🔄 Data Management
- CSV export of tournament results
- Player roster management with DUPR ratings
- Match tracking with live scores
- Cloud-based data persistence
- Automatic localStorage migration

### 📱 Mobile Support
- Progressive Web App (PWA)
- Install on iOS and Android
- Offline-capable with Service Worker
- Native app-like experience
- Responsive design for all screen sizes

## Tech Stack

### Frontend
- **React 19.1.1** - Modern UI framework
- **Tailwind CSS 3.4** - Utility-first styling
- **PWA** - Progressive Web App capabilities
- **Service Worker** - Offline support

### Backend
- **Node.js + Express** - RESTful API server
- **PostgreSQL** - Relational database
- **JWT** - Secure authentication
- **bcrypt** - Password hashing
- **Helmet** - Security headers

### Deployment
- **Frontend**: Vercel / Netlify / GitHub Pages
- **Backend**: Railway (recommended) / AWS
- **Database**: Railway PostgreSQL

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+ (for local development)

### Local Development

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/SmashBoard.git
cd SmashBoard
```

#### 2. Setup Backend
```bash
cd backend
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your database credentials

# Setup database
createdb smashboard
npm run migrate

# Start backend server
npm run dev
```

Backend runs on `http://localhost:5000`

#### 3. Setup Frontend
```bash
# From root directory
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local to set REACT_APP_API_URL=http://localhost:5000

# Start frontend
npm start
```

Frontend runs on `http://localhost:3000`

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for comprehensive deployment instructions including:
- Railway backend deployment
- Frontend hosting options (Vercel, Netlify, GitHub Pages)
- Database setup and migrations
- Environment variable configuration
- Production checklist

## Project Structure

```
SmashBoard/
├── backend/                     # Node.js backend API
│   ├── src/
│   │   ├── config/              # Database & configuration
│   │   ├── controllers/         # Request handlers
│   │   ├── middleware/          # Auth middleware
│   │   ├── models/              # Database models
│   │   ├── routes/              # API routes
│   │   └── server.js            # Express app
│   ├── package.json
│   └── README.md
├── src/                         # React frontend
│   ├── components/              # React components
│   │   ├── AuthPage.js
│   │   ├── Login.js
│   │   ├── Register.js
│   │   └── MigrationPrompt.js
│   ├── contexts/
│   │   └── AuthContext.js       # Authentication context
│   ├── hooks/
│   │   └── useAPI.js            # API integration hooks
│   ├── utils/
│   │   └── localStorageMigration.js
│   ├── PickleballTournamentManager.js  # Main app
│   ├── App.js
│   └── index.js
├── public/                      # Static assets & PWA config
│   ├── manifest.json
│   ├── sw.js                    # Service Worker
│   └── index.html
├── DEPLOYMENT.md                # Deployment guide
└── README.md                    # This file
```

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

## Environment Variables

### Frontend (.env.local)
```env
REACT_APP_API_URL=http://localhost:5000
```

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/smashboard
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
```

## Key Features Explained

### DUPR Rating System
Players are rated 0-10 based on DUPR (Dynamic Universal Pickleball Rating). The system:
- Auto-matches players by skill level
- Creates balanced teams
- Prevents skill mismatches

### Automatic Data Migration
When users first login:
1. System detects localStorage data
2. Prompts to migrate to cloud
3. Creates automatic backup
4. Uploads players and tournaments
5. Clears local data after success

### PWA Capabilities
- **Installable**: Add to home screen on mobile
- **Offline**: Works without internet (cached)
- **Fast**: Service Worker caching
- **Reliable**: Network-first for data, cache-first for assets

## Development Scripts

### Frontend
```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run deploy     # Deploy to GitHub Pages
```

### Backend
```bash
npm run dev        # Start with nodemon (auto-reload)
npm start          # Start production server
npm run migrate    # Run database migrations
```

## Security Features

- ✅ Bcrypt password hashing (10 salt rounds)
- ✅ JWT tokens with 7-day expiration
- ✅ Helmet.js security headers
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS configured for specific origins
- ✅ Secure session management

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Android Chrome 90+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or feature requests:
- Create an issue on GitHub
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment help
- Review backend [README](backend/README.md) for API details

## Roadmap

- [ ] File uploads (tournament logos, player photos)
- [ ] Real-time match updates (WebSockets)
- [ ] Mobile apps (React Native)
- [ ] Tournament analytics dashboard
- [ ] Email notifications
- [ ] Social sharing features
- [ ] Multi-language support

## Acknowledgments

- Built with [Create React App](https://create-react-app.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Hosted on [Railway](https://railway.app/)

---

**Made with ❤️ for the Pickleball community**
