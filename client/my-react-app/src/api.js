const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export async function request(path, options = {}) {
  const headers = { ...options.headers };
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Can't reach the API at ${API_URL}. Start the server from the server folder with "npm start".`);
    }
    throw error;
  }

  let data = null;
  if (response.status !== 204 && response.headers.get('content-type')?.includes('application/json')) {
    data = await response.json();
  }
  if (!response.ok) {
    const error = new Error(data && data.error ? data.error : `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export { API_URL };
