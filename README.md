# Restaurant Record

A restaurant curation and discovery application for tracking exceptional dining experiences around the world.

## Overview

Restaurant Record helps you discover, organize, and remember exceptional restaurants. Track must-visit dining destinations, record culinary experiences, and build your own curated collection of remarkable restaurants.

### Key Features

- **Restaurant Discovery**: Curate exceptional restaurants from around the world
- **Personal Tracking**: Mark restaurants as "must-visit" or "visited" with personal ratings and notes
- **Smart Filtering**: Filter by cuisine type and visit status
- **Rich Details**: Store cuisine types, must-try dishes, price ranges, atmosphere, dietary options, and booking requirements
- **Admin Panel**: Add restaurants via URL extraction with intelligent content analysis

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS with custom earth-tone design system
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Backend**: Planned Supabase integration

## Development

### Prerequisites

- Node.js (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm

### Getting Started

```bash
# Install dependencies
npm i

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

### Project Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── PlaceCard.tsx # Core restaurant display component
│   ├── AdminPanel.tsx # Admin interface for adding restaurants
│   ├── FilterBar.tsx # Restaurant filtering by cuisine
│   └── MapView.tsx   # Map view toggle
├── pages/
│   ├── Index.tsx     # Main application
│   └── NotFound.tsx  # 404 page
├── hooks/            # Custom React hooks
└── lib/              # Utilities
```

## Design System

The app uses an earth-toned "brutalist" design aesthetic:

- **Colors**: Warm stone, burnt orange, deep burgundy, olive green, charcoal
- **Typography**: Space Grotesk for headings, JetBrains Mono for code/data
- **Components**: Bold, high-contrast UI with strong visual hierarchy

## Current Status

The application currently runs with mock data. Full functionality requires:

- [ ] Supabase database setup
- [ ] Magic link authentication
- [ ] Automated restaurant metadata extraction
- [ ] Map integration for restaurant locations

## Deployment

This project is built with [Lovable](https://lovable.dev) and can be deployed directly through their platform:

1. Visit the [Lovable Project](https://lovable.dev/projects/3e6fb383-2f1c-4c45-b00b-37588736b5db)
2. Click Share → Publish
3. Optional: Connect a custom domain via Project → Settings → Domains

## Contributing

This is a personal curation tool, but the codebase demonstrates modern React patterns with TypeScript, component-based architecture, and design system implementation.