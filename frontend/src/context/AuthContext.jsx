
import {
  createContext,
  useContext,
  useState,
} from 'react';

const AuthContext = createContext(null);

function loadSavedUser() {
  try {
    const saved = localStorage.getItem('demoUser');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

async function sendAuthRequest(endpoint, form) {
  let response;

  try {
    response = await fetch(`/api/auth/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    });
  } catch {
    throw new Error(
      'Cannot reach the server. Please make sure the backend is running.'
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error('The server returned an invalid response.');
  }

  if (!response.ok) {
    throw new Error(
      data.message || `${endpoint} failed. Please try again.`
    );
  }

  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSavedUser);

  const saveSession = (loggedInUser, token) => {
    if (!loggedInUser) {
      throw new Error('The server did not return user information.');
    }

    if (token) {
      localStorage.setItem('token', token);
    }

    localStorage.setItem(
      'demoUser',
      JSON.stringify(loggedInUser)
    );

    localStorage.removeItem('demoRole');
    setUser(loggedInUser);

    return loggedInUser;
  };

  const login = async (email, password) => {
    const data = await sendAuthRequest('login', {
      email,
      password,
    });

    const token = data.token || data.accessToken;
    const loggedInUser = data.user || data.data?.user;

    if (!token) {
      throw new Error(
        'The server did not return an authentication token.'
      );
    }

    return saveSession(loggedInUser, token);
  };

  const register = async (form) => {
    const data = await sendAuthRequest('register', {
      ...form,
      semester: Number(form.semester),
    });

    const token = data.token || data.accessToken;
    const newUser = data.user || data.data?.user;

    if (token && newUser) {
      return saveSession(newUser, token);
    }

    // If registration does not automatically log the student in,
    // the student can log in using their registered credentials.
    return newUser || data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('demoUser');
    localStorage.removeItem('demoRole');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: false,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
