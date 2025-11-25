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

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes* | Full backend API URL | `http://localhost:8002` |
| `NEXT_PUBLIC_API_HOST` | Yes* | API hostname (if not using NEXT_PUBLIC_API_URL) | `localhost` |
| `NEXT_PUBLIC_API_PORT` | No | API port (default: 8002) | `8002` |

*Either `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_API_HOST` is required.

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