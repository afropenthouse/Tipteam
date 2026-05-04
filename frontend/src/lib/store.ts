import { useEffect, useState } from "react";
import { api } from "./api";
import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  updateUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  forgotPasswordDirect,
  listBusinesses,
  getBusiness,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  listFeedback,
  addFeedback,
  listWithdrawals,
  requestWithdrawal,
  confirmWithdrawal,
  walletBalance,
  totalWalletBalance,
  initializePayment,
  verifyPayment,
} from "./api";
import type { User, Business, Feedback, Withdrawal } from "./api";

export type { User, Business, Feedback, Withdrawal };

export { 
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  updateUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  forgotPasswordDirect,
  listBusinesses,
  getBusiness,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  listFeedback,
  addFeedback,
  listWithdrawals,
  requestWithdrawal,
  confirmWithdrawal,
  walletBalance,
  totalWalletBalance,
  initializePayment,
  verifyPayment,
};

export function useStore<T>(reader: () => T): T {
  const [value, setValue] = useState<T>(reader);
  useEffect(() => {
    const handler = () => setValue(reader());
    window.addEventListener("ttt:store", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("ttt:store", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}

export function useCurrentUser() {
  return useStore(() => getCurrentUser());
}
