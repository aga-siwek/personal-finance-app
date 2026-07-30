import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/axios";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { TransactionDTO } from "@/types/api";

export type TransactionSort =
  | "latest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "amount_asc"
  | "amount_desc";

export interface TransactionQuery {
  page: number;
  per_page: number;
  search: string;
  sort: TransactionSort;
  /** A category id, or "all" for no filter. */
  category_id: number | "all";
}

interface TransactionsResponse {
  transactions: TransactionDTO[];
  page: number;
  per_page: number;
  total: number;
}

export interface TransactionInput {
  recipient_name: string;
  /** Signed integer cents: positive for income, negative for an expense. */
  amount: number;
  category_id: number;
  /** ISO date, `YYYY-MM-DD`. */
  transaction_date: string;
}

interface TransactionsState {
  items: TransactionDTO[];
  page: number;
  per_page: number;
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: TransactionsState = {
  items: [],
  page: 1,
  per_page: 10,
  total: 0,
  loading: false,
  error: null,
};

export const fetchTransactions = createAsyncThunk<
  TransactionsResponse,
  TransactionQuery,
  { rejectValue: string }
>("transactions/fetch", async (query, { rejectWithValue }) => {
  try {
    const params: Record<string, string | number> = {
      page: query.page,
      per_page: query.per_page,
      sort: query.sort,
    };
    if (query.search.trim()) params.search = query.search.trim();
    if (query.category_id !== "all") params.category_id = query.category_id;

    const response = await api.get<TransactionsResponse>("/transactions", {
      params,
    });
    return response.data;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err));
  }
});

export const createTransaction = createAsyncThunk<
  void,
  TransactionInput,
  { rejectValue: string }
>("transactions/create", async (input, { rejectWithValue }) => {
  try {
    await api.post("/transactions", input);
  } catch (err) {
    return rejectWithValue(
      getApiErrorMessage(err, "Could not add transaction."),
    );
  }
});

export const updateTransaction = createAsyncThunk<
  void,
  { id: number } & TransactionInput,
  { rejectValue: string }
>("transactions/update", async ({ id, ...input }, { rejectWithValue }) => {
  try {
    await api.put(`/transactions/${id}`, input);
  } catch (err) {
    return rejectWithValue(
      getApiErrorMessage(err, "Could not update transaction."),
    );
  }
});

export const deleteTransaction = createAsyncThunk<
  void,
  number,
  { rejectValue: string }
>("transactions/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/transactions/${id}`);
  } catch (err) {
    return rejectWithValue(
      getApiErrorMessage(err, "Could not delete transaction."),
    );
  }
});

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.transactions;
        state.page = action.payload.page;
        state.per_page = action.payload.per_page;
        state.total = action.payload.total;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load transactions.";
      });
  },
});

export default transactionsSlice.reducer;
