# Context Assistant

Context-aware AI assistant for three.js project.

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Build three.js (from project root):
```bash
npm run build
```

3. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
context-assistant/
├── src/
│   ├── components/     # React/Vue components
│   ├── services/       # Business logic services
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main app component
│   └── main.ts         # Entry point
├── tests/
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── public/             # Static assets
└── dist/               # Production build output
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:unit` - Run unit tests with coverage
- `npm run test:integration` - Run integration tests
- `npm run lint` - Run linter

## Testing

Target: 80% code coverage

Run tests with coverage:
```bash
npm run test:coverage
```

## Browser Support

Matches three.js browser support: `> 1%, not dead, not ie 11, not op_mini all`

