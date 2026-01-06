import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE_URL = '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');

    if (storedAccessToken && storedRefreshToken && storedUser) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setUser(JSON.parse(storedUser));
      
      // Verify token is still valid by fetching user info
      fetchUserInfo(storedAccessToken).catch(() => {
        // Token invalid, try to refresh
        if (storedRefreshToken) {
          refreshAccessToken(storedRefreshToken).catch(() => {
            // Refresh failed, clear everything
            logout();
          });
        } else {
          logout();
        }
      });
    }
    setLoading(false);
  }, []);

  // Fetch user info with access token
  const fetchUserInfo = async (token) => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const data = await response.json();
    return data.user;
  };

  // Refresh access token
  const refreshAccessToken = async (refreshTokenValue) => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    const newAccessToken = data.accessToken;
    
    setAccessToken(newAccessToken);
    localStorage.setItem('accessToken', newAccessToken);
    
    return newAccessToken;
  };

  // Login
  const login = async (email, password) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/contexts/AuthContext.jsx:80',message:'Client login function called',data:{apiBaseUrl:API_BASE_URL,hasEmail:!!email,hasPassword:!!password},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.log('[AuthContext] login() called');
    console.log('[AuthContext] API_BASE_URL:', API_BASE_URL);
    console.log('[AuthContext] Email:', email);
    console.log('[AuthContext] Password provided:', !!password);
    
    const loginUrl = `${API_BASE_URL}/auth/login`;
    console.log('[AuthContext] Making request to:', loginUrl);
    
    try {
      const requestBody = JSON.stringify({ email, password });
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/contexts/AuthContext.jsx:92',message:'Client making fetch request',data:{url:loginUrl,method:'POST'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/contexts/AuthContext.jsx:100',message:'Client received response',data:{status:response.status,ok:response.ok,contentType:response.headers.get('content-type')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      console.log('[AuthContext] Response status:', response.status);
      console.log('[AuthContext] Response ok:', response.ok);
      console.log('[AuthContext] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/contexts/AuthContext.jsx:103',message:'Client response not ok',data:{status:response.status,contentType:response.headers.get('content-type')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        console.error('[AuthContext] Response not ok, parsing error...');
        let error;
        try {
          error = await response.json();
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/contexts/AuthContext.jsx:107',message:'Client parsed error as JSON',data:{error:error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          console.error('[AuthContext] Error response body:', error);
        } catch (parseError) {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/contexts/AuthContext.jsx:110',message:'Client failed to parse error as JSON',data:{parseErrorName:parseError.name,parseErrorMessage:parseError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          console.error('[AuthContext] Failed to parse error response:', parseError);
          const text = await response.text();
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/contexts/AuthContext.jsx:112',message:'Client got error response text',data:{textLength:text.length,textPreview:text.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          console.error('[AuthContext] Error response text:', text);
          throw new Error(`Login failed with status ${response.status}`);
        }
        throw new Error(error.error || 'Login failed');
      }

      console.log('[AuthContext] Response ok, parsing JSON...');
      const data = await response.json();
      console.log('[AuthContext] Response data received:', { 
        hasUser: !!data.user, 
        hasAccessToken: !!data.accessToken, 
        hasRefreshToken: !!data.refreshToken 
      });
      
      console.log('[AuthContext] Setting user state...');
      setUser(data.user);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      
      console.log('[AuthContext] Saving to localStorage...');
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('[AuthContext] Login successful');
    } catch (error) {
      console.error('[AuthContext] Login fetch error:', error);
      console.error('[AuthContext] Error name:', error.name);
      console.error('[AuthContext] Error message:', error.message);
      console.error('[AuthContext] Error stack:', error.stack);
      throw error;
    }
  };

  // Register
  const register = async (email, password, name) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    
    setUser(data.user);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  // Logout
  const logout = async () => {
    // Try to revoke refresh token on server
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        // Ignore errors on logout
        console.error('Logout error:', error);
      }
    }

    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  // Get access token (with automatic refresh if needed)
  const getAccessToken = useCallback(async () => {
    // Check state first, but fallback to localStorage if state is empty (handles race condition after login)
    let token = accessToken;
    let storedRefreshToken = refreshToken;
    
    if (!token) {
      // State is empty, check localStorage (handles race condition where state hasn't updated yet)
      token = localStorage.getItem('accessToken');
      storedRefreshToken = localStorage.getItem('refreshToken');
    }
    
    if (!token) {
      return null;
    }

    // Check if token is expired (simple check - in production, decode and check exp)
    try {
      // Try to use current token
      return token;
    } catch (error) {
      // Token expired, try to refresh
      if (storedRefreshToken) {
        try {
          const newToken = await refreshAccessToken(storedRefreshToken);
          return newToken;
        } catch (error) {
          // Refresh failed, logout
          logout();
          return null;
        }
      }
      return null;
    }
  }, [accessToken, refreshToken]);

  // Get auth headers for API requests
  const getAuthHeaders = async () => {
    const token = await getAccessToken();
    if (!token) return null;
    return { 'Authorization': `Bearer ${token}` };
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    loading,
    login,
    register,
    logout,
    getAccessToken,
    refreshAccessToken,
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

