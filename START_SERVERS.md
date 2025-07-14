# 🚀 Start Liner Notes Discovery App

## Prerequisites
1. **Install Redis** (if not installed):
   ```bash
   brew install redis
   ```

2. **Start Redis** (if not running):
   ```bash
   brew services start redis
   # OR manually: redis-server
   ```

## Quick Start

### 1. Start Backend Server
```bash
cd /Users/mattthackston/LinerNotes/backend
npm run dev
```
The backend will start on: **http://localhost:3001**

### 2. Start Frontend Server (in new terminal)
```bash
cd /Users/mattthackston/LinerNotes/frontend
npm start
```
The frontend will start on: **http://localhost:3000**

## Test the Enhanced Search

1. **Open your browser** to: http://localhost:3000
2. **Search for songs** like:
   - "Come Together Beatles" 
   - "Abbey Road Beatles"
   - "Yesterday Beatles"
   - "Bohemian Rhapsody Queen"

## Expected Behavior ✨

### **Best Match Indicators**
- ⭐ **"Best Match"** = Original studio albums (priority score ≥ 2000)
- **"Good Match"** = Singles and good releases (score 1500-1999) 
- 🚀 **"Fast"** = Cached results (sub-100ms response)

### **Smart Prioritization**
- **Original studio albums** appear FIRST (e.g., "Abbey Road" before compilations)
- **Albums ranked by**: Official > Studio > Live > Compilation > Bootleg
- **Chronological sorting** within each category

### **Cache Performance**
- **First search**: ~2 seconds (fetching from MusicBrainz)
- **Repeat search**: ~50ms (Redis cache hit)
- **Popular artists** (Beatles, Queen, etc.): 24-hour cache
- **Other artists**: 6-hour cache

## Development Mode Features

In development, you'll see additional info:
- **Priority scores** and **scoring reasons**
- **Cache hit/miss** status and timing
- **Search metadata** showing source breakdown

## Troubleshooting

### Redis Connection Issues
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not working, try:
brew services restart redis
```

### Backend Issues
- Check console for errors
- Verify .env file has correct database credentials
- PostgreSQL should be running (app works without DB for search)

### Frontend Issues
- Ensure backend is running on port 3001
- Check browser console for errors
- Try refreshing the page

## Test Searches 🎵

Try these to see smart prioritization:
- **"Come Together Beatles"** - Original single should rank high
- **"Abbey Road Beatles"** - Studio album should be top result  
- **"Beatles Greatest Hits"** - Compilations should rank lower
- **"Bohemian Rhapsody Queen"** - Should show fast cache hit on repeat