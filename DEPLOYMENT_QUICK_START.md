# Deployment Quick Start

Get the Eco-Friendly Route Planner up and running in minutes.

## 🚀 Quick Start (Development)

```bash
# 1. Clone and navigate to project
cd eco-route-planner

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys and secrets

# 3. Deploy with one command
./scripts/deploy.sh dev

# 4. Access the application
# Frontend: http://localhost:8080
# Backend:  http://localhost:3000
```

## 📋 Prerequisites Checklist

- [ ] Docker installed (version 20.10+)
- [ ] Docker Compose installed (version 2.0+)
- [ ] Google Maps API key OR Geoapify API key
- [ ] SendGrid API key (for email)
- [ ] `.env` file configured

## ⚙️ Environment Configuration

### Minimum Required Configuration

Edit `.env` and set these values:

```bash
# Generate secure secrets
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
SESSION_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
DB_PASSWORD=<strong-password>

# External APIs
GOOGLE_MAPS_API_KEY=<your-key>
SENDGRID_API_KEY=<your-key>
EMAIL_FROM=noreply@yourdomain.com
```

## 🔧 Common Commands

```bash
# Start development environment
./scripts/deploy.sh dev

# Stop services
./scripts/deploy.sh stop

# Check status
./scripts/deploy.sh status

# View logs
docker-compose logs -f

# Backup database
./scripts/backup/backup-database.sh

# Restart a service
docker-compose restart backend
```

## 🏥 Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# Backend readiness
curl http://localhost:3000/ready

# Frontend health
curl http://localhost:8080/health
```

## 🐛 Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker ps

# View service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Restart services
docker-compose restart
```

### Database connection errors

```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify environment variables
cat .env | grep DB_
```

### Port already in use

```bash
# Find process using port
lsof -i :3000  # Backend
lsof -i :8080  # Frontend
lsof -i :5432  # Database

# Change ports in .env
BACKEND_PORT=3001
FRONTEND_PORT=8081
DB_PORT=5433
```

## 📚 Next Steps

1. **Read the full guide:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. **Configure monitoring:** Set up log aggregation and alerts
3. **Set up backups:** Configure automated database backups
4. **Review security:** Follow the security checklist
5. **Test the application:** Run through user flows

## 🆘 Getting Help

- Check logs: `docker-compose logs -f`
- Health endpoints: `/health` and `/ready`
- Full documentation: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Database guide: [scripts/backup/README.md](scripts/backup/README.md)

## 🔒 Security Reminders

Before production deployment:

- ✅ Change all default passwords
- ✅ Use strong, unique secrets
- ✅ Enable HTTPS
- ✅ Configure firewall rules
- ✅ Set up automated backups
- ✅ Review CORS settings
- ✅ Enable rate limiting

## 📊 Monitoring

Access admin dashboard after deployment:
- Login as admin user
- Navigate to `/admin`
- View system metrics, user management, and audit logs

---

**Ready to deploy?** Run `./scripts/deploy.sh dev` to get started!
