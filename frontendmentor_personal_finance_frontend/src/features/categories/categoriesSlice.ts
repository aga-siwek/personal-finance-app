import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/axios";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { CategoryDTO } from "@/types/api";

interface CategoriesState {
  items: CategoryDTO[];
  /** id → name, for the many screens that render a category's name from a
   * `category_id` the API returns (budgets, transactions, the Overview). */
  namesById: Record<number, string>;
  loading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  items: [],
  namesById: {},
  loading: false,
  error: null,
};

export const fetchCategories = createAsyncThunk<
  CategoryDTO[],
  void,
  { rejectValue: string }
>("categories/fetch", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ categories: CategoryDTO[] }>("/categories");
    return response.data.categories;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err));
  }
});

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.namesById = Object.fromEntries(
          action.payload.map((c) => [c.id, c.name]),
        );
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load categories.";
      });
  },
});

export default categoriesSlice.reducer;
