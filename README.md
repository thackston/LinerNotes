# Liner Notes Discovery App

A comprehensive liner notes discovery application that allows users to search for songs, artists, and albums to find detailed credit information, then discover connections between musicians, producers, and songwriters.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+ (optional, but recommended)

### Installation

1. **Clone and setup the project:**
```bash
git clone <your-repo-url>
cd LinerNotes
```

2. **Backend Setup:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database and API credentials
```

3. **Frontend Setup:**
```bash
cd ../frontend
npm install
```

4. **Database Setup:**
```bash
cd ../backend
npm run db:init
```

### Running the Application

1. **Start the backend:**
```bash
cd backend
npm run dev
```

2. **Start the frontend:**
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health Check: http://localhost:3001/api/health

## 📁 Project Structure

```
LinerNotes/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service calls
│   │   └── utils/           # Utility functions
│   └── package.json
├── backend/                 # Node.js TypeScript backend
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # External API integrations
│   │   ├── models/          # Database models
│   │   ├── config/          # Configuration files
│   │   ├── middleware/      # Custom middleware
│   │   └── scripts/         # Database scripts
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with:

```env
# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=liner_notes
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Keys
TIDAL_API_KEY=your-tidal-api-key
MUSICBRAINZ_USER_AGENT=LinerNotesApp/1.0.0 (your-email@example.com)
GENIUS_API_KEY=your-genius-api-key
```

### Database Setup

The database schema includes tables for:
- Users and authentication
- Search history
- Favorites and collections
- User follows (social features)
- API response caching
- Playlists and integrations

Run the database initialization script:
```bash
npm run db:init
```

## 🎵 API Endpoints

### Search Endpoints
- `GET /api/search/songs?q=query` - Search for songs with credits
- `GET /api/search/artists?q=query` - Search for artists
- `GET /api/search/albums?q=query` - Search for albums
- `GET /api/search/people?q=query&role=producer` - Search for people by role
- `GET /api/search/song/:id` - Get detailed song information

### User Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/users/profile` - Get user profile
- `POST /api/users/favorites` - Add to favorites

### Health Check
- `GET /api/health` - API health status

## 🔌 API Integrations

### TIDAL Music API
Primary source for comprehensive music credits data. Currently using mock implementation - replace with actual TIDAL API when available.

### MusicBrainz API
Supplementary metadata source. Free and open-source music database with extensive relationship data.

### Caching Strategy
- Redis for session management and API response caching
- Database-level caching for frequently accessed data
- Intelligent cache invalidation

## 🛠️ Development

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run db:init` - Initialize database schema

**Frontend:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Code Style
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Consistent naming conventions
- Comprehensive error handling

## 📊 Features

### Phase 1 (MVP) - ✅ Foundation Complete
- [x] React + TypeScript + Tailwind CSS frontend
- [x] Node.js + Express + TypeScript backend
- [x] PostgreSQL database with comprehensive schema
- [x] Redis caching layer
- [x] TIDAL Music API integration (mock)
- [x] MusicBrainz API integration
- [ ] User authentication (Auth0)
- [ ] Core search functionality
- [ ] User profiles and favorites

### Phase 2 (Enhanced Discovery)
- [ ] Advanced search filters
- [ ] Collaboration discovery
- [ ] Visual relationship mapping
- [ ] Social features
- [ ] Personalized recommendations

### Phase 3 (Playlist Integration)
- [ ] Spotify API integration
- [ ] Apple Music integration
- [ ] Auto-generated playlists
- [ ] Social playlist sharing

### Phase 4 (Monetization & Scale)
- [ ] Premium subscription features
- [ ] Advanced analytics
- [ ] Community contributions
- [ ] Enterprise API access

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers

## 🚀 Deployment

### Production Environment
- Frontend: Vercel or Netlify
- Backend: Railway, Render, or AWS
- Database: PostgreSQL (managed service)
- Redis: Redis Cloud or AWS ElastiCache

### Environment Setup
1. Update environment variables for production
2. Configure database with proper credentials
3. Set up CDN for static assets
4. Configure monitoring and logging

## 📈 Monitoring

- Health check endpoints
- Error tracking with structured logging
- Performance monitoring
- API usage analytics
- Database query optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Check the project documentation
- Open an issue on GitHub
- Review the API documentation

---

**Note:** This is a comprehensive music discovery application focused on liner notes and credits information. The current implementation uses mock data for TIDAL Music API - replace with actual API integrations when available.
