import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/axios";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PotDTO } from "@/types/api";

export interface PotInput {
  name: string;
  target_amount: number;
  theme: string;
}

interface PotsState {
  items: PotDTO[];
  loading: boolean;
  error: string | null;
}

const initialState: PotsState = { items: [], loading: false, error: null };

export const fetchPots = createAsyncThunk<PotDTO[], void, { rejectValue: string }>(
  "pots/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ pots: PotDTO[] }>("/pots");
      return response.data.pots;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err));
    }
  },
);

export const createPot = createAsyncThunk<void, PotInput, { rejectValue: string }>(
  "pots/create",
  async (input, { dispatch, rejectWithValue }) => {
    try {
      await api.post("/pots", input);
      await dispatch(fetchPots());
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, "Could not create pot."));
    }
  },
);

export const updatePot = createAsyncThunk<
  void,
  { id: number } & PotInput,
  { rejectValue: string }
>("pots/update", async ({ id, ...input }, { dispatch, rejectWithValue }) => {
  try {
    await api.put(`/pots/${id}`, input);
    await dispatch(fetchPots());
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Could not update pot."));
  }
});

export const deletePot = createAsyncThunk<void, number, { rejectValue: string }>(
  "pots/delete",
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await api.delete(`/pots/${id}`);
      await dispatch(fetchPots());
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, "Could not delete pot."));
    }
  },
);

export const changePotMoney = createAsyncThunk<
  void,
  { id: number; amount: number; operation: "add" | "withdraw" },
  { rejectValue: string }
>("pots/money", async ({ id, amount, operation }, { dispatch, rejectWithValue }) => {
  try {
    await api.post(`/pots/${id}/${operation}`, { amount });
    await dispatch(fetchPots());
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Could not update this pot."));
  }
});

const potsSlice = createSlice({
  name: "pots",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPots.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load pots.";
      });
  },
});

export default potsSlice.reducer;
