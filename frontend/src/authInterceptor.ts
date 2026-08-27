const originalFetch = window.fetch.bind(window);

/** Matches the code thrown by the backend when a user has no tenant assigned. */
const TENANT_NOT_ASSIGNED = 'TENANT_NOT_ASSIGNED';

const signOut = (reason: string) => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_role');
  window.location.href = `/login?${reason}`;
};

window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const hadToken = localStorage.getItem('access_token');
  const onLoginPage = window.location.pathname.startsWith('/login');

  if (response.status === 401 && hadToken && !onLoginPage) {
    signOut('expired=1');
    return response;
  }

  // A 403 usually just means "this role can't do that" and must not sign the
  // user out. The one exception is an account with no tenant: every request it
  // makes will fail the same way, so keeping it in the CRM shows empty screens
  // with no explanation.
  if (response.status === 403 && hadToken && !onLoginPage) {
    try {
      const body = await response.clone().json();
      if (body?.code === TENANT_NOT_ASSIGNED) {
        signOut('no_tenant=1');
      }
    } catch {
      // Not JSON, or already consumed — treat it as an ordinary role denial.
    }
  }

  return response;
};
