# Security Setup Instructions

## 🚨 CRITICAL: Before Production Deployment

### 1. Generate Strong JWT Secret

**NEVER use the default JWT secret in production!**

Generate a strong, random JWT secret:

```bash
# Generate a 64-byte random secret
openssl rand -base64 64
```

Replace the `JWT_SECRET` in your production `.env` file with this generated secret.

### 2. Database Security

- Use strong, unique database credentials
- Ensure PostgreSQL is configured with SSL in production
- Never use default passwords like `password`

### 3. Environment Variables

Create a production `.env` file with:

```env
# Server Configuration
PORT=3001
FRONTEND_URL=https://your-production-domain.com
JWT_SECRET=your-generated-64-byte-secret-here

# Database Configuration (use strong credentials)
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=liner_notes_prod
DB_USER=your-secure-db-user
DB_PASSWORD=your-strong-db-password

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# API Keys
TIDAL_API_KEY=your-actual-tidal-api-key
MUSICBRAINZ_USER_AGENT=LinerNotesApp/1.0.0 (your-contact-email@domain.com)
GENIUS_API_KEY=your-actual-genius-api-key
```

### 4. Security Checklist

- [ ] Generated strong JWT secret (64+ bytes)
- [ ] Updated all default passwords
- [ ] Configured SSL for database connections
- [ ] Set up proper CORS origins for production
- [ ] Enabled HTTPS for frontend domain
- [ ] Reviewed rate limiting settings
- [ ] Set NODE_ENV=production
- [ ] Configured proper logging and monitoring

### 5. Rate Limiting Configuration

The application includes multiple rate limiting tiers:

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Login attempts**: 3 attempts per 15 minutes
- **Search**: 30 requests per minute

Adjust these limits in `/middleware/rateLimiting.ts` based on your needs.

### 6. Monitoring

Monitor these security metrics in production:

- Failed authentication attempts
- Rate limit violations
- Database connection errors
- JWT token validation failures

## Security Features Implemented

✅ **Authentication & Authorization**
- JWT-based authentication with proper verification
- Password hashing with bcrypt (12 salt rounds)
- Protected routes with authentication middleware

✅ **Input Validation & Sanitization**
- Comprehensive input validation using express-validator
- XSS protection with input escaping
- SQL injection prevention with parameterized queries

✅ **Rate Limiting**
- Multi-tier rate limiting system
- Stricter limits for authentication endpoints
- Search-specific rate limiting

✅ **Security Headers**
- Helmet.js for security headers
- Proper CORS configuration
- Environment-specific error handling

✅ **Database Security**
- SSL-enabled database connections
- Parameterized queries throughout
- Input validation at database layer

## Production Deployment Security

1. **SSL/HTTPS**: Ensure all traffic is encrypted
2. **Secrets Management**: Use proper secrets management (AWS Secrets Manager, etc.)
3. **Database Security**: Use managed database services with SSL
4. **Monitoring**: Set up security monitoring and alerting
5. **Backups**: Implement secure backup strategies
6. **Updates**: Keep dependencies updated regularly

## Contact

For security concerns or to report vulnerabilities, contact: [your-security-email@domain.com]