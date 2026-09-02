/**
 * Re-export Clerk's React SDK under the local alias "./lib/fakeClerk".
 *
 * All existing imports throughout the codebase (e.g. from "./lib/fakeClerk")
 * continue to work without modification.  The "Show", "SignIn", "SignUp"
 * components are now the real Clerk implementations instead of the former
 * always-signed-in stubs.
 *
 * In development mode without VITE_CLERK_PUBLISHABLE_KEY, the "Show" component
 * renders all children (treats user as signed-in) so the app is usable.
 */

import React from "react";
import {
  SignedIn,
  SignedOut,
  useAuth as clerkUseAuth,
  useUser as clerkUseUser,
  useClerk as clerkUseClerk,
  UserButton as ClerkUserButton,
} from "@clerk/clerk-react";

export {
  ClerkProvider,
  ClerkLoaded,
  ClerkLoading,
  ClerkFailed,
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";

export function UserButton({
  appearance,
  children,
  ...props
}: {
  appearance?: {
    elements?: {
      avatarBox?: string;
    };
  };
  children?: React.ReactNode;
  [key: string]: any;
}) {
  if (!hasClerkKey) {
    return (
      <button
        className="flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
        onClick={() => window.location.href="/sign-in"}
      >
        Sign In
      </button>
    );
  }
  return <ClerkUserButton appearance={appearance} {...props} />;
}

/**
 * Whether a Clerk publishable key is available.
 * When false, the app runs in dev-without-clerk mode.
 */
const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * Compatibility shim for the "Show" component used throughout the codebase.
 *
 * <Show when="signed-in"> renders children only when authenticated.
 * <Show when="signed-out"> renders children only when not authenticated.
 *
 * When Clerk is not configured (no VITE_CLERK_PUBLISHABLE_KEY), treats
 * the user as always signed-in so the app is usable in local development.
 */
export function Show({
  when,
  children,
}: {
  when: string;
  children: React.ReactNode;
}) {
  if (!hasClerkKey) {
    return when === "signed-in" ? <>{children}</> : null;
  }
  if (when === "signed-in") {
    return <SignedIn>{children}</SignedIn>;
  }
  if (when === "signed-out") {
    return <SignedOut>{children}</SignedOut>;
  }
  return null;
}

/**
 * Re-export useAuth so that existing imports from "./lib/fakeClerk" keep working.
 * When Clerk is not configured, returns a stub so components don't crash.
 */
export function useAuth() {
  if (!hasClerkKey) {
    return {
      isLoaded: false,
      isSignedIn: false,
      userId: null,
      sessionId: null,
      getToken: async () => null,
    };
  }
  return clerkUseAuth();
}

/**
 * Re-export useUser so existing imports keep working.
 * When Clerk is not configured, returns a stub user.
 */
export function useUser() {
  if (!hasClerkKey) {
    return {
      isLoaded: false,
      isSignedIn: false,
      user: null,
    };
  }
  return clerkUseUser();
}

/**
 * Re-export useClerk so existing imports keep working.
 * When Clerk is not configured, returns a stub.
 */
export function useClerk() {
  if (!hasClerkKey) {
    return {
      addListener: () => () => {},
      signOut: async () => {},
    };
  }
  return clerkUseClerk();
}
