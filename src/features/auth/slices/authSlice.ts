import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../../services/api';
import { authStorage } from '../../../services/authStorage';
import type { CurrentUser } from '../../../types/user';
import type { AuthState, LoginPayload, TokenResponse } from '../../../types/auth';

const initialState: AuthState = {
  user: null,
  token: authStorage.getToken(),
  refreshToken: authStorage.getRefreshToken(),
  isAuthenticated: !!authStorage.getToken(),
  isLoading: false,
  error: null,
};

// Login Thunk
export const loginUser = createAsyncThunk<
  CurrentUser,
  LoginPayload,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    // 1. Post credentials to get tokens
    const tokenRes = await api.post<TokenResponse>('/auth/login', credentials);
    if (!tokenRes.success || !tokenRes.data) {
      return rejectWithValue(tokenRes.message || 'Login failed');
    }

    const { access_token, refresh_token } = tokenRes.data;
    authStorage.setTokens(access_token, refresh_token);

    // 2. Fetch current user profile
    const userRes = await api.get<CurrentUser>('/auth/me');
    if (!userRes.success || !userRes.data) {
      return rejectWithValue('Failed to load user profile');
    }

    return userRes.data;
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'Invalid email or password';
    return rejectWithValue(errorMsg);
  }
});

// Fetch Current User Thunk (Session Rehydration)
export const fetchCurrentUser = createAsyncThunk<
  CurrentUser,
  void,
  { rejectValue: string }
>('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const userRes = await api.get<CurrentUser>('/auth/me');
    if (!userRes.success || !userRes.data) {
      return rejectWithValue('Failed to fetch user');
    }
    return userRes.data;
  } catch (err: any) {
    authStorage.clearAll();
    return rejectWithValue(err.message || 'Session expired');
  }
});

// Logout Thunk
export const logoutUser = createAsyncThunk<void, void>('auth/logout', async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore server logout errors, token will be cleared client-side
  } finally {
    authStorage.clearAll();
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    updateUserSuccess: (state, action: PayloadAction<CurrentUser>) => {
      state.user = action.payload;
    },
    resetAuthState: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      authStorage.clearAll();
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.token = authStorage.getToken();
        state.refreshToken = authStorage.getRefreshToken();
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload || 'Authentication failed';
      });

    // Fetch Current User
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    });
  },
});

export const { clearAuthError, updateUserSuccess, resetAuthState } = authSlice.actions;
export default authSlice.reducer;
