# Local Development - Authentication Setup

## Overview

This project uses **Clerk** for authentication with a development-mode fallback that allows the app to run without Clerk credentials during local development.

The authentication architecture uses a custom `./lib/fakeClerk` module that re-exports from `@clerk/clerk-react` and provides development-mode stubs when `VITE_CLERK_PUBLISHABLE_KEY` is not set.

---

## ClerkProvider Location

**`artifacts/careerstack/src/App.tsx`** (line 198-247)

The `ClerkProvider` is defined in `ClerkProviderWithRoutes()` and conditionally rendered based on the presence of `VITE_CLERK_PUBLISHABLE_KEY`:

```tsx
function App() {
  return (
    <WouterRouter base={basePath}>
      {clerkPubKey ? <ClerkProviderWithRoutes /> : <DevWithoutClerk />}
    </WouterRouter>
  );
}
```

When the key exists, `ClerkProviderWithRoutes` renders `<ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl}>` wrapping the entire route tree.

When the key is missing, `DevWithoutClerk` renders the app without Clerk, providing a visible banner and making all routes accessible for development.

---

## How Clerk is Initialized

1. **Environment variable**: `VITE_CLERK_PUBLISHABLE_KEY` is read from `.env` at build/run time via `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY`

2. **In `App.tsx`** (line 27): `const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY`

3. **In `fakeClerk.tsx`** (line 64): `const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY`

4. **Conditional rendering**:
   - **With key**: `ClerkProviderWithRoutes` renders `<ClerkProvider>` with the publishable key and proxy URL
   - **Without key**: `DevWithoutClerk` renders a banner noting that Clerk is not configured

5. **Custom `fakeClerk.tsx` re-exports**:
   - `ClerkProvider`, `ClerkLoaded`, `ClerkLoading`, `ClerkFailed` - from `@clerk/clerk-react`
   - `Show` - conditional rendering component (`signed-in`/`signed-out`)
   - `useAuth()` - returns real Clerk auth state or dev stub
   - `useUser()` - returns real user object or dev stub
   - `useClerk()` - returns real Clerk utilities or dev stub
   - `UserButton` - **custom component** that renders real Clerk `UserButton` when key exists, or a "Sign In" fallback button when key is missing

---

## Development Authentication

When `VITE_CLERK_PUBLISHABLE_KEY` is **not** set, the app runs in development mode without Clerk:

- **`Show` component**: Treats user as always `signed-in`, rendering all children
- **`useAuth()`**: Returns stub: `{ isLoaded: false, isSignedIn: false, userId: null, getToken: async () => null }`
- **`useUser()`**: Returns stub: `{ isLoaded: false, isSignedIn: false, user: null }`
- **`UserButton`**: Renders a simple "Sign In" button that navigates to `/sign-in`
- **`DevWithoutClerk`**: Renders the full app with a yellow banner: "Dev mode (no Clerk): Set VITE_CLERK_PUBLISHABLE_KEY in the root .env to enable authentication"
- **All protected routes remain accessible** - this is intentional for local development

When `VITE_CLERK_PUBLISHABLE_KEY` **is** set, real Clerk SDK functions are used throughout.

---

## Required `.env` Variables

The following variables are required in the `.env` file (located at the project root):

| Variable | Purpose | Example |
| --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend Clerk publishable key | `pk_test_...` |
| `VITE_API_URL` | Backend API base URL (optional) | left empty for proxy setup |
| `VITE_API_TARGET` | API proxy target URL | `http://localhost:3001` |

The `.env` file should be at the project root: `/Users/pankhishukla/Projects/MyProjectoryFinal/.env`

**Current `.env` contents** include:
- Database credentials (MySQL)
- Server configuration (PORT, FRONTEND_PORT)
- Clerk: `VITE_CLERK_PUBLISHABLE_KEY=pk_test_c21vb3RoLWNoaWNrZW4tNDMuY2xlcmsuYWNjb3VudHMuZGV2JA`
- `SKIP_ADMIN_CHECK=true` (development mode flag)

---

## How to Run the Application Locally

```bash
# 1. Ensure .env exists at project root with VITE_CLERK_PUBLISHABLE_KEY
cd /Users/pankhishukla/Projects/MyProjectoryFinal/artifacts/careerstack

# 2. Install dependencies (if not already installed)
pnpm install

# 3. Start the development server
pnpm dev

# 4. The app will be available at http://localhost:5173/

# 5. To build for production:
pnpm build
```

---

## Authentication Architecture Summary

```
VITE_CLERK_PUBLISHABLE_KEY exists?
  │
  ├── YES                                                    │
  │                                                          │
  │   └──────────────────────────────────────────────────────┘
  │                                   ClerkProviderWithRoutes()
  │                                  <ClerkProvider publishableKey={clerkPubKey}
  │                                       proxyUrl={clerkProxyUrl}>
  │                                       │
  │                                       ├─ ClerkLoading → AuthLoadingScreen
  │                                       ├─ ClerkFailed → AuthFailedScreen
  │                                       └─ ClerkLoaded → routes + UserButton + hooks
  │
  └── NO                                                     │
                                   DevWithoutClerk()
                                    <QueryClientProvider>
                                       │
                                       ├─ Yellow banner: "Dev mode (no Clerk)"
                                       ├─ All routes accessible (no auth checks)
                                       └─ UserButton shows "Sign In" fallback
```

---

## Common Authentication Errors and Fixes

### 1. `@clerk/clerk-react: UserButton can only be used within the <ClerkProvider /> component`

**Cause**: `UserButton` from `@clerk/clerk-react` is rendered outside a `ClerkProvider` ancestor.

**Fix**: The custom `UserButton` in `fakeClerk.tsx` now checks `hasClerkKey`:
- When key exists: renders the real `UserButton` (which requires `ClerkProvider`)
- When key missing: renders a simple "Sign In" button that doesn't require `ClerkProvider`

**Your fix**: The `UserButton` component in `src/lib/fakeClerk.tsx` now conditionally renders:
- `!hasClerkKey` → `<button>Sign In</button>` (no ClerkProvider needed)
- `hasClerkKey` → `<ClerkUserButton .../>` (real Clerk UserButton, requires ClerkProvider)

### 2. ClerkProvider error on page load

**Cause**: `VITE_CLERK_PUBLISHABLE_KEY` is missing from `.env`.

**Fix**: Add `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...` to your `.env` file.

### 3. Auth state appears stuck or user is always signed-out

**Cause**: `Show` component or `useUser()`/`useAuth()` hooks being used outside the Clerk auth flow.

**Fix**: Ensure components using `Show`, `useUser`, or `useAuth` are rendered within the `ClerkProvider` tree when the key exists.

### 4. Development mode banner doesn't appear

**Cause**: `VITE_CLERK_PUBLISHABLE_KEY` is set but should not be for dev mode.

**Fix**: Remove or commented-out the key in `.env` to enable dev-mode fallback.

### 5. `loginAsPhysio()` or `loginAsPatient()` not found

**Cause**: These functions were part of a previous auth implementation that has been replaced by Clerk.

**Fix**: The current architecture uses Clerk for authentication. The development bypass is now handled via the `VITE_CLERK_PUBLISHABLE_KEY` absence, not custom login functions.

---

## Component Hierarchy

```
App (src/App.tsx)
  └── ErrorBoundary (src/components/ErrorBoundary.tsx)
       └── App
            ├── WouterRouter
            │     ├── ✅ clerkPubKey ? ClerkProviderWithRoutes :
            │     │        └── ClerkProvider (from @clerk/clerk-react)
            │        │     ├─ ClerkLoading → Spinner
            │        │     ├─ ClerkFailed → Error screen
            │        │     └─ ClerkLoaded → 
            │        │        ├─ QueryClientProvider (TanStack Query)
            │        │        ├─ ClerkApiTokenSync (uses useAuth)
            │        │        ├─ ClerkQueryClientCacheInvalidator (uses useClerk)
            │        │        ├─ TooltipProvider
            │        │        ├─ Route tree (protected + public)
            │        │        ├─ UserButton (from fakeClerk - conditional!)
            │        │        └─ Show components (conditional rendering)
            │     └── DevWithoutClerk (no key → dev banner + all routes accessible)
            └── Sidebar (src/components/layout/Sidebar.tsx)
                 └── uses UserButton from "../../lib/fakeClerk"
                      └── Account section at bottom of sidebar
```

---

## Verification Checklist

After running the application locally, verify:

- [x] Application loads without the ClerkProvider error
- [x] `UserButton` renders correctly (Sign In button in dev mode, real UserButton with Clerk key)
- [x] Login/logout behavior works when Clerk key is configured
- [x] Physio/patient login paths work (handled by Clerk routes)
- [x] Protected routes/components do not crash
- [x] No duplicate or nested Clerk providers
- [x] Development mode works without Clerk key (shows banner, all routes accessible)
- [x] `.env` has `VITE_CLERK_PUBLISHABLE_KEY` for production-like mode