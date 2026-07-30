import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import authReducer from "@/features/auth/authSlice";
import uiReducer from "@/features/ui/uiSlice";
import overviewReducer from "@/features/overview/overviewSlice";
import categoriesReducer from "@/features/categories/categoriesSlice";
import transactionsReducer from "@/features/transactions/transactionsSlice";
import budgetsReducer from "@/features/budgets/budgetsSlice";
import potsReducer from "@/features/pots/potsSlice";
import recurringBillsReducer from "@/features/recurring-bills/recurringBillsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    overview: overviewReducer,
    categories: categoriesReducer,
    transactions: transactionsReducer,
    budgets: budgetsReducer,
    pots: potsReducer,
    recurringBills: recurringBillsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
