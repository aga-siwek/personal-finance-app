import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/axios";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { RecurringBillDTO } from "@/types/api";

export type RecurringBillSort =
  | "latest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "amount_asc"
  | "amount_desc";

interface RecurringBillsState {
  items: RecurringBillDTO[];
  loading: boolean;
  error: string | null;
}

const initialState: RecurringBillsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchRecurringBills = createAsyncThunk<
  RecurringBillDTO[],
  { search: string; sort: RecurringBillSort },
  { rejectValue: string }
>("recurringBills/fetch", async ({ search, sort }, { rejectWithValue }) => {
  try {
    const params: Record<string, string> = { sort };
    if (search.trim()) params.search = search.trim();
    const response = await api.get<{ recurring_bills: RecurringBillDTO[] }>(
      "/recurring-bills",
      { params },
    );
    return response.data.recurring_bills;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err));
  }
});

const recurringBillsSlice = createSlice({
  name: "recurringBills",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecurringBills.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecurringBills.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchRecurringBills.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load recurring bills.";
      });
  },
});

export default recurringBillsSlice.reducer;
