import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/axios";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { BudgetSummaryDTO, TransactionDTO } from "@/types/api";

export interface BudgetInput {
  category_id: number;
  max_spend: number;
  theme: string;
}

interface BudgetsState {
  items: BudgetSummaryDTO[];
  /** Up to three most-recent transactions per budget category ("Latest
   * Spending"), keyed by category id. */
  latestByCategory: Record<number, TransactionDTO[]>;
  loading: boolean;
  error: string | null;
}

const initialState: BudgetsState = {
  items: [],
  latestByCategory: {},
  loading: false,
  error: null,
};

export const fetchBudgets = createAsyncThunk<
  BudgetSummaryDTO[],
  void,
  { rejectValue: string }
>("budgets/fetch", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ budgets: BudgetSummaryDTO[] }>("/budgets");
    return response.data.budgets;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err));
  }
});

export const fetchBudgetSpending = createAsyncThunk<
  { categoryId: number; transactions: TransactionDTO[] },
  number
>("budgets/fetchSpending", async (categoryId) => {
  const response = await api.get<{ transactions: TransactionDTO[] }>(
    "/transactions",
    { params: { category_id: categoryId, per_page: 3, sort: "latest" } },
  );
  return { categoryId, transactions: response.data.transactions };
});

export const createBudget = createAsyncThunk<
  void,
  BudgetInput,
  { rejectValue: string }
>("budgets/create", async (input, { dispatch, rejectWithValue }) => {
  try {
    await api.post("/budgets", input);
    await dispatch(fetchBudgets());
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Could not create budget."));
  }
});

export const updateBudget = createAsyncThunk<
  void,
  { id: number; max_spend: number; theme: string },
  { rejectValue: string }
>("budgets/update", async ({ id, max_spend, theme }, { dispatch, rejectWithValue }) => {
  try {
    await api.put(`/budgets/${id}`, { max_spend, theme });
    await dispatch(fetchBudgets());
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Could not update budget."));
  }
});

export const deleteBudget = createAsyncThunk<
  void,
  number,
  { rejectValue: string }
>("budgets/delete", async (id, { dispatch, rejectWithValue }) => {
  try {
    await api.delete(`/budgets/${id}`);
    await dispatch(fetchBudgets());
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Could not delete budget."));
  }
});

const budgetsSlice = createSlice({
  name: "budgets",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBudgets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load budgets.";
      })
      .addCase(fetchBudgetSpending.fulfilled, (state, action) => {
        state.latestByCategory[action.payload.categoryId] =
          action.payload.transactions;
      });
  },
});

export default budgetsSlice.reducer;
