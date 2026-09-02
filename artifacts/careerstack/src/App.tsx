import { useEffect, useRef } from "react";
import {
  ClerkFailed,
  ClerkProvider,
  ClerkLoaded,
  ClerkLoading,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useAuth,
  useUser,
} from "./lib/fakeClerk";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter, useParams } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { AppRoutes } from "@/components/layout/AppRoutes";
import PublicPortfolioPage from "@/pages/public-portfolio";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const isDevMode = import.meta.env.DEV;
if (!clerkPubKey && !isDevMode) {
  throw new Error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to your .env file or environment variables.",
  );
}

// In production, if the API lives on a different origin, configure the base URL
// so all generated API calls are prefixed correctly.
const apiBaseUrl = import.meta.env.VITE_API_URL;
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Spinner className="size-6 text-primary" />
        <div>
          <p className="font-medium">Loading your workspace</p>
          <p className="text-sm text-muted-foreground">Checking your authentication state...</p>
        </div>
      </div>
    </div>
  );
}

function AuthFailedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-xl font-semibold">Authentication failed to load</h1>
        <p className="text-sm text-muted-foreground">
          Check your VITE_CLERK_PUBLISHABLE_KEY and internet connection, then refresh the page.
        </p>
      </div>
    </div>
  );
}

function ClerkApiTokenSync() {
  const { isLoaded, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    setAuthTokenGetter(() => getToken());
    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken, isLoaded]);

  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: any }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function PublicPortfolioSlugRoute() {
  const params = useParams();
  const slug = params?.slug;
  const isInternal = slug === "new" || (/^\d+$/.test(slug || ""));

  if (isInternal) {
    return <ProtectedRoute component={AppRoutes} />;
  }

  return <PublicPortfolioPage mode="slug" />;
}

function PublicPortfolioTokenRoute() {
  return <PublicPortfolioPage mode="token" />;
}

function AdminProtectedRoute({ component: Component }: { component: any }) {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  return (
    <>
      <Show when="signed-in">
        {isAdmin ? <Component /> : <Redirect to="/dashboard" />}
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

/**
 * Renders the full application with Clerk authentication.
 */
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkLoading>
        <AuthLoadingScreen />
      </ClerkLoading>
      <ClerkFailed>
        <AuthFailedScreen />
      </ClerkFailed>
      <ClerkLoaded>
        <QueryClientProvider client={queryClient}>
          <ClerkApiTokenSync />
          <ClerkQueryClientCacheInvalidator />
          <TooltipProvider>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/portfolio-share/:token" component={PublicPortfolioTokenRoute} />
              <Route path="/portfolio/private/:token" component={PublicPortfolioTokenRoute} />
              <Route path="/portfolio/:slug" component={PublicPortfolioSlugRoute} />
              <Route path="/dashboard" component={() => <ProtectedRoute component={AppRoutes} />} />
              <Route path="/portfolio" component={() => <ProtectedRoute component={AppRoutes} />} />
              <Route path="/portfolio/:id" component={() => <ProtectedRoute component={AppRoutes} />} />
              <Route path="/student-portfolios" component={() => <ProtectedRoute component={AppRoutes} />} />
              <Route path="/scores" component={() => <ProtectedRoute component={AppRoutes} />} />
              <Route path="/roadmaps" component={() => <ProtectedRoute component={AppRoutes} />} />
              <Route path="/roadmaps/:id" component={() => <ProtectedRoute component={AppRoutes} />} />
              <Route path="/stacks/:id" component={() => <ProtectedRoute component={AppRoutes} />} />
              <Route path="/jobs" component={() => <ProtectedRoute component={AppRoutes} />} />
              <Route path="/admin/domains" component={() => <AdminProtectedRoute component={AppRoutes} />} />
              <Route path="/admin/scraping" component={() => <AdminProtectedRoute component={AppRoutes} />} />
              <Route path="/market-intelligence" component={() => <ProtectedRoute component={AppRoutes} />} />
              <Route path="/profile" component={() => <ProtectedRoute component={AppRoutes} />} />
              <Route component={NotFound} />
            </Switch>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

/**
 * Fallback when VITE_CLERK_PUBLISHABLE_KEY is missing in development.
 * Renders the app without Clerk auth — all protected routes are accessible.
 * The backend must run with SKIP_ADMIN_CHECK=true for API calls to work.
 */
function DevWithoutClerk() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "#fef3c7", borderBottom: "1px solid #f59e0b",
          padding: "8px 16px", fontSize: "13px", color: "#92400e",
          fontFamily: "system-ui, sans-serif",
        }}>
          <strong>Dev mode (no Clerk):</strong> Set{" "}
          <code style={{ background: "#fef9c3", padding: "1px 4px", borderRadius: "3px" }}>
            VITE_CLERK_PUBLISHABLE_KEY
          </code>{" "}
          in the root <code>.env</code> to enable authentication. Backend must run with{" "}
          <code style={{ background: "#fef9c3", padding: "1px 4px", borderRadius: "3px" }}>
            SKIP_ADMIN_CHECK=true
          </code>.
        </div>
        <div style={{ marginTop: "40px" }}>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/portfolio-share/:token" component={PublicPortfolioTokenRoute} />
            <Route path="/portfolio/private/:token" component={PublicPortfolioTokenRoute} />
            <Route path="/portfolio/:slug" component={PublicPortfolioSlugRoute} />
            <Route path="/dashboard" component={AppRoutes} />
            <Route path="/portfolio" component={AppRoutes} />
            <Route path="/portfolio/:id" component={AppRoutes} />
            <Route path="/student-portfolios" component={AppRoutes} />
            <Route path="/scores" component={AppRoutes} />
            <Route path="/roadmaps" component={AppRoutes} />
            <Route path="/roadmaps/:id" component={AppRoutes} />
            <Route path="/stacks/:id" component={AppRoutes} />
            <Route path="/jobs" component={AppRoutes} />
            <Route path="/admin/domains" component={AppRoutes} />
            <Route path="/admin/scraping" component={AppRoutes} />
            <Route path="/market-intelligence" component={AppRoutes} />
            <Route path="/profile" component={AppRoutes} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      {clerkPubKey ? <ClerkProviderWithRoutes /> : <DevWithoutClerk />}
    </WouterRouter>
  );
}

export default App;
