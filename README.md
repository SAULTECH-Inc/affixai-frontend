# AI Document Signer - React Frontend

## Overview

This is the **Web Interface** for the AI-powered document automation and digital signing platform. Built with React 18, TypeScript, and Tailwind CSS.

## Features

### ✅ Implemented

1. **Authentication**
   - Email/password login and registration
   - OAuth support (Google ready)
   - Protected routes
   - Auto token refresh
   - Persistent sessions

2. **Dashboard**
   - Statistics overview
   - Recent documents
   - Quick actions
   - Activity feed

3. **Document Management**
   - Document upload interface
   - Document list and filtering
   - Document viewer (placeholder)
   - Status tracking

4. **Data Vault**
   - Encrypted data management
   - Category organization
   - Identity graph visualization
   - Add/edit/delete fields

5. **Signature Management**
   - Signature creation (placeholder)
   - Multiple signature types
   - Default signature selection
   - Signature library

6. **Settings**
   - Profile management
   - Security settings
   - Notification preferences

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **React Query** - Data fetching
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client
- **Sonner** - Toast notifications
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Running NestJS backend (port 3000)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your backend URL
# VITE_API_URL=http://localhost:3000/api/v1

# Start development server
npm run dev
```

The app will be available at http://localhost:3001

### Build for Production

```bash
# Build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── documents/         # Document components
│   ├── data-vault/        # Data vault components
│   ├── signatures/        # Signature components
│   └── shared/            # Shared components
│       ├── MainLayout.tsx # Main app layout
│       └── AuthLayout.tsx # Auth page layout
├── pages/
│   ├── LoginPage.tsx      # Login page
│   ├── RegisterPage.tsx   # Registration page
│   ├── DashboardPage.tsx  # Dashboard
│   ├── DocumentsPage.tsx  # Documents list
│   ├── DocumentViewPage.tsx  # Document viewer
│   ├── DataVaultPage.tsx  # Data vault
│   ├── SignaturesPage.tsx # Signatures
│   └── SettingsPage.tsx   # Settings
├── hooks/                 # Custom React hooks
├── lib/
│   └── api.ts            # API client
├── store/
│   └── authStore.ts      # Auth state (Zustand)
├── types/
│   └── index.ts          # TypeScript types
├── styles/
│   └── globals.css       # Global styles
├── App.tsx               # App component with routing
└── main.tsx              # Entry point
```

## Key Features

### Authentication Flow

1. User enters credentials
2. API call to NestJS backend
3. Receive JWT tokens
4. Store in localStorage
5. Auto-attach to requests
6. Auto-refresh on expiry

### Protected Routes

All main app routes require authentication:
- `/dashboard`
- `/documents`
- `/data-vault`
- `/signatures`
- `/settings`

### API Integration

The app connects to the NestJS backend running on port 3000:

```typescript
// Automatic token management
// Automatic token refresh
// Error handling
// Request/response interceptors
```

## Environment Variables

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_FASTAPI_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_ENABLE_OAUTH=true
VITE_MAX_FILE_SIZE_MB=50
```

## Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

## Styling with Tailwind

Custom utility classes available:

```css
/* Buttons */
.btn              /* Base button */
.btn-primary      /* Primary button */
.btn-secondary    /* Secondary button */
.btn-outline      /* Outline button */

/* Forms */
.input            /* Input field */

/* Layout */
.card             /* Card container */
.container-custom /* Max-width container */
```

## State Management

### Auth State (Zustand)

```typescript
const { user, isAuthenticated, login, logout } = useAuthStore();
```

### API State (React Query)

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['documents'],
  queryFn: () => api.get('/documents'),
});
```

## Form Handling

Using React Hook Form + Zod:

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});
```

## Features To Be Fully Implemented

### Document Upload & Processing
- Drag-and-drop file upload
- Progress tracking
- OCR processing status
- Field extraction display

### Interactive Canvas
- PDF.js integration
- Field placement with Fabric.js
- Drag-and-drop field positioning
- Signature placement
- Zoom and pan controls

### Data Vault
- Category-based views
- Search and filter
- Export functionality
- Bulk import

### Signatures
- Draw signature with canvas
- Type signature
- Upload signature image
- Digital certificate integration

## Integration with Backend

### NestJS Endpoints Used

```typescript
// Auth
POST   /auth/login
POST   /auth/register
POST   /auth/refresh
GET    /users/profile

// Documents
GET    /documents
POST   /documents/upload
GET    /documents/:id
POST   /documents/:id/process
POST   /documents/:id/sign

// Data Vault
GET    /data-vault
POST   /data-vault
GET    /data-vault/identity-graph

// Signatures
GET    /signatures
POST   /signatures
PUT    /signatures/:id/set-default
```

## Responsive Design

The app is fully responsive:
- Mobile: Collapsible sidebar
- Tablet: Optimized layouts
- Desktop: Full sidebar navigation

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development Tips

### Hot Module Replacement
Vite provides instant HMR for fast development

### TypeScript
All components are fully typed for better DX

### Tailwind CSS
Use the JIT compiler for optimal bundle size

## Deployment

### Build

```bash
npm run build
```

Output: `dist/` folder

### Deploy

Can be deployed to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting

## Testing

```bash
# Run tests (when implemented)
npm run test

# Run with coverage
npm run test:coverage
```

## Performance

- Code splitting with React lazy loading
- Optimized bundle size with Vite
- Image optimization
- API response caching with React Query

## Security

- XSS protection with React
- CSRF tokens for API requests
- Secure token storage
- Auto token refresh
- Protected routes

## Next Steps

1. ✅ Implement full document upload UI
2. ✅ Add interactive canvas with Fabric.js
3. ✅ Complete data vault CRUD
4. ✅ Add signature drawing canvas
5. ✅ Implement document sharing
6. ✅ Add real-time updates with WebSockets

## Contributing

This is part of a larger project. Coordinate before making changes.

## License

Proprietary - All rights reserved
