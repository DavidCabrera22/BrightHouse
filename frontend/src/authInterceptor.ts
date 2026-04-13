const originalFetch = window.fetch.bind(window);

window.fetch = async (...args) => {
  const response = await originalFetch(...args);

  if (response.status === 401) {
    const hadToken = localStorage.getItem('access_token');
    if (hadToken && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_role');
      window.location.href = '/login?expired=1';
    }
  }

  return response;
};
