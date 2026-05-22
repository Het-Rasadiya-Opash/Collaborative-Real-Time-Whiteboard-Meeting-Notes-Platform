import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  users: [],
  currentUser: null,
  isCheckingAuth: true,
  loading: false,
  error: null,
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setUsers: (state, action) => {
      state.users = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
      state.isCheckingAuth = false;
      state.loading = false;
      state.error = null;
    },
    setCheckingAuth: (state, action) => {
      state.isCheckingAuth = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      state.currentUser = null;
      state.isCheckingAuth = false;
      state.error = null;
    },
  },
});

export const {
  setUsers,
  setCurrentUser,
  setCheckingAuth,
  setLoading,
  setError,
  clearError,
  logout,
} = usersSlice.actions;

export default usersSlice.reducer;
