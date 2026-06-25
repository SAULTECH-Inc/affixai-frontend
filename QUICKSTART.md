# Quick Start - React Frontend

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:3000/api/v1
```

### 3. Start Development
```bash
npm run dev
```

Visit http://localhost:3001

## ✅ First Login

**Test Account**:
1. Go to http://localhost:3001/register
2. Create an account
3. Login at http://localhost:3001/login

## 📋 Requirements

Make sure these are running:
- ✅ NestJS backend on port 3000
- ✅ FastAPI on port 8000
- ✅ PostgreSQL database
- ✅ Redis cache

## 🎯 Features Available

- ✅ Login/Register
- ✅ Dashboard with stats
- ✅ Protected routes
- ✅ Responsive design
- ✅ Toast notifications

## 🔧 Common Issues

**Backend not connecting?**
Check VITE_API_URL in .env matches your NestJS URL

**CORS errors?**
Ensure NestJS CORS is configured for http://localhost:3001

## 📖 Full Documentation

See [README.md](./README.md) for complete documentation.
