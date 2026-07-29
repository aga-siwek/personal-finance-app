import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/axios";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { OverviewResponse } from "@/types/api";

interface OverviewState {
  data: OverviewResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: OverviewState = {
  data: null,
  loading: false,
  error: null,
};

/** One aggregated round trip for the whole dashboard (PRD §6.3) — never four
 * separate list fetches re-summed on the client. */
export const fetchOverview = createAsyncThunk<
  OverviewResponse,
  void,
  { rejectValue: string }
>("overview/fetch", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<OverviewResponse>("/overview");
    return response.data;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err));
  }
});

const overviewSlice = createSlice({
  name: "overview",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load your overview.";
      });
  },
});

export default overviewSlice.reducer;
