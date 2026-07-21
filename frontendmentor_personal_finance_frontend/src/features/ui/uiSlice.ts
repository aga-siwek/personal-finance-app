import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  /** Desktop/tablet sidebar collapsed ("Minimize Menu") state. */
  sidebarCollapsed: boolean;
}

const initialState: UiState = {
  sidebarCollapsed: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarCollapsed } = uiSlice.actions;
export default uiSlice.reducer;
