/**
 * Clerk Authentication Controller for Nayak's Sujay
 * Publishable key: pk_test_c2FmZS1sZW9wYXJkLTE4MjEuY2xlcmsuYWNjb3VudHMuZGV2JA
 *
 * Keeps session active across browser restarts with auto-login on open.
 * Shows sign-in screen when signed out, and reveals full billing workspace
 * with user profile button when signed in.
 */

const CLERK_PUBLISHABLE_KEY = "pk_test_c2FmZS1sZW9wYXJkLTE4MjEuY2xlcmsuYWNjb3VudHMuZGV2JA";

async function initClerkAuth() {
  const authScreen = document.getElementById('auth-screen');
  const appWorkspace = document.getElementById('app-workspace');
  const signInDiv = document.getElementById('clerk-sign-in');
  const userButtonDiv = document.getElementById('clerk-user-button');
  const loadingText = document.getElementById('auth-loading-text');

  // Wait for window.Clerk to be injected by the CDN script
  let attempts = 0;
  while (!window.Clerk && attempts < 80) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }

  if (!window.Clerk) {
    if (loadingText) {
      loadingText.textContent = "Clerk authentication library could not be loaded. Please check your internet connection.";
    }
    return;
  }

  try {
    const clerkAppearance = {
      variables: {
        colorPrimary: '#F26B1D',
        colorBackground: '#FFFFFF',
        colorText: '#111827',
        colorTextSecondary: '#4B5563',
        borderRadius: '10px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      },
      elements: {
        card: {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          borderRadius: '14px',
          border: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF'
        },
        formButtonPrimary: {
          backgroundColor: '#F26B1D',
          fontSize: '13px',
          fontWeight: '600',
          letterSpacing: '0.2px',
          '&:hover': {
            backgroundColor: '#E05A0E'
          }
        },
        headerTitle: {
          fontWeight: '700',
          color: '#111827'
        },
        headerSubtitle: {
          color: '#6B7280'
        }
      }
    };

    if (!window.Clerk.loaded) {
      await window.Clerk.load({
        publishableKey: CLERK_PUBLISHABLE_KEY,
        appearance: clerkAppearance
      });
    }

    let signInMounted = false;
    let userButtonMounted = false;

    function updateAuthState(user) {
      if (user) {
        // User is authenticated: display billing workspace, hide login modal
        if (authScreen) authScreen.style.display = 'none';
        if (appWorkspace) appWorkspace.style.display = 'flex';

        if (userButtonDiv && !userButtonMounted) {
          window.Clerk.mountUserButton(userButtonDiv, {
            appearance: clerkAppearance
          });
          userButtonMounted = true;
        }
      } else {
        // User signed out: hide workspace, display Clerk sign in card
        if (appWorkspace) appWorkspace.style.display = 'none';
        if (authScreen) authScreen.style.display = 'flex';
        if (loadingText) loadingText.style.display = 'none';

        if (signInDiv && !signInMounted) {
          window.Clerk.mountSignIn(signInDiv, {
            appearance: clerkAppearance
          });
          signInMounted = true;
        }
      }
    }

    // Check initial auth status (persists across page reloads & browser restarts)
    updateAuthState(window.Clerk.user);

    // Subscribe to session state changes
    window.Clerk.addListener(({ user }) => {
      updateAuthState(user);
    });

  } catch (err) {
    console.error("Clerk initialization error:", err);
    if (loadingText) {
      loadingText.textContent = "Authentication error: " + (err.message || err);
    }
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClerkAuth);
} else {
  initClerkAuth();
}
