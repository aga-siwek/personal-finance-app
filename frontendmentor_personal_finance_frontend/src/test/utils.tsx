import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import uiReducer from "@/features/ui/uiSlice";
import overviewReducer from "@/features/overview/overviewSlice";
import categoriesReducer from "@/features/categories/categoriesSlice";
import transactionsReducer from "@/features/transactions/transactionsSlice";
import budgetsReducer from "@/features/budgets/budgetsSlice";

/** Render a component inside a fresh Redux store + router for tests. */
export function renderWithProviders(
  ui: ReactElement,
  { route = "/" }: { route?: string } = {},
) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      overview: overviewReducer,
      categories: categoriesReducer,
      transactions: transactionsReducer,
      budgets: budgetsReducer,
    },
  });
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>,
    ),
  };
}
