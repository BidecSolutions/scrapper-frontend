# Scrapper Frontend

A Next.js 14 frontend application for the lead scraper platform.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8002
```

Or use separate host and port:
```env
NEXT_PUBLIC_API_HOST=localhost
NEXT_PUBLIC_API_PORT=8002
```

3. Run the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Deployment on Vercel

### Automatic Deployment (Recommended)

1. **Connect your repository to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub/GitLab/Bitbucket account
   - Click "New Project"
   - Import your repository

2. **Configure Environment Variables:**
   In the Vercel project settings, add the following environment variables:
   
   **Required:**
   - `NEXT_PUBLIC_API_URL` - Your backend API URL (e.g., `https://api.yourdomain.com`)
   
   **Optional (if not using NEXT_PUBLIC_API_URL):**
   - `NEXT_PUBLIC_API_HOST` - API hostname
   - `NEXT_PUBLIC_API_PORT` - API port

3. **Deploy:**
   - Vercel will automatically detect Next.js and deploy
   - Every push to your main branch will trigger a new deployment
   - Preview deployments are created for pull requests

### Manual Deployment via Vercel CLI

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
vercel
```

For production deployment:
```bash
vercel --prod
```

4. **Set Environment Variables:**
```bash
vercel env add NEXT_PUBLIC_API_URL
```

### Vercel Configuration

The project includes a `vercel.json` configuration file with:
- Framework detection (Next.js)
- Build and install commands
- Output directory settings
- Region configuration (US East - iad1)

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes* | Full backend API URL | `https://api.example.com` |
| `NEXT_PUBLIC_API_HOST` | Yes* | API hostname (if not using NEXT_PUBLIC_API_URL) | `api.example.com` |
| `NEXT_PUBLIC_API_PORT` | No | API port (default: 8002) | `8002` |

*Either `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_API_HOST` is required.

### Build Settings

Vercel will automatically detect:
- **Framework:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### Custom Domain

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

### Troubleshooting

**Build fails:**
- Check that all environment variables are set
- Verify Node.js version (18+)
- Review build logs in Vercel dashboard

**API connection issues:**
- Ensure `NEXT_PUBLIC_API_URL` is correctly set
- Check CORS settings on your backend API
- Verify the API URL is accessible from the internet

**Environment variables not working:**
- Remember that `NEXT_PUBLIC_*` variables are exposed to the browser
- Redeploy after adding/changing environment variables
- Check variable names for typos

## Project Structure

```
├── app/              # Next.js 14 App Router pages
├── components/       # React components
├── contexts/         # React contexts
├── lib/              # Utility functions and API client
├── types/            # TypeScript type definitions
└── public/           # Static assets
```

## Scripts

- `npm run dev` - Start development server
- `npm run dev:3001` - Start development server on port 3001
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack

- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **HTTP Client:** Axios
- **Animations:** Framer Motion
- **Icons:** Lucide React