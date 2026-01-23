# How to Start the Frontend (Next.js)

## Prerequisites
Make sure you have:
- Node.js 18+ installed
- All dependencies installed: `npm install`

## Start the Frontend Server

### Development Mode (Recommended)
```bash
cd scrapper-frontend
npm run dev
```

The app will start on: **http://localhost:3000**

### Alternative Port (3001)
```bash
cd scrapper-frontend
npm run dev:3001
```

The app will start on: **http://localhost:3001**

## Verify Frontend is Running

1. Open browser: http://localhost:3000
2. You should see the dashboard
3. Check browser console for any errors

## Default Ports
- **Port 3000**: Default Next.js dev server
- **Port 3001**: Alternative port (if needed)

## Stop the Server
Press `Ctrl + C` in the terminal

## Production Build (Optional)
```bash
cd scrapper-frontend
npm run build
npm start
```

