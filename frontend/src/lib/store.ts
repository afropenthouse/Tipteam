import { useEffect, useState } from "react";
import * as api from "./api";
import type { User, Business, Feedback, Withdrawal } from "./api";

export type { User, Business, Feedback, Withdrawal };

export const signUp = async (input: { fullName: string; email: string; password: string }) => {
  return api.signUp(input);
};

export const signIn = async (email: string, password: string) => {
  return api.signIn(email, password);
};

export const signOut = () => {
  api.signOut();
};

export const getCurrentUser = (): User | null => {
  return api.getCurrentUser();
};

export const updateUser = async (patch: Partial<User>) => {
  await api.updateUser(patch);
};

export const verifyEmail = async (email: string, code: string) => {
  return api.verifyEmail(email, code);
};

export const forgotPassword = async (email: string) => {
  return api.forgotPassword(email);
};

export const resetPassword = async (email: string, code: string, password: string) => {
  return api.resetPassword(email, code, password);
};

export const listBusinesses = async (): Promise<Business[]> => {
  return api.listBusinesses();
};

export const getBusiness = async (id: string): Promise<Business | undefined> => {
  return api.getBusiness(id);
};

export const createBusiness = async (data: Omit<Business, "id" | "ownerId" | "createdAt">): Promise<Business> => {
  return api.createBusiness(data);
};

export const updateBusiness = async (id: string, patch: Partial<Business>) => {
  return api.updateBusiness(id, patch);
};

export const deleteBusiness = async (id: string) => {
  return api.deleteBusiness(id);
};

export const listFeedback = async (businessId?: string): Promise<Feedback[]> => {
  return api.listFeedback(businessId);
};

export const addFeedback = async (input: Omit<Feedback, "id" | "createdAt" | "updatedAt">): Promise<Feedback> => {
  return api.addFeedback(input);
};

export const listWithdrawals = async (businessId?: string): Promise<Withdrawal[]> => {
  return api.listWithdrawals(businessId);
};

export const requestWithdrawal = async (businessId: string, amount: number, accountNumber: string, bankName: string) => {
  return api.requestWithdrawal(businessId, amount, accountNumber, bankName);
};

export const confirmWithdrawal = async (withdrawalId: string, code: string): Promise<Withdrawal> => {
  return api.confirmWithdrawal(withdrawalId, code);
};

export const walletBalance = async (businessId: string) => {
  const { wallet } = await api.get<{ wallet: { earned: number; withdrawn: number; available: number } }>(
    `/withdrawals/business/${businessId}`
  );
  return wallet;
};

export const totalWalletBalance = async () => {
  const { wallet } = await api.get<{ wallet: { earned: number; withdrawn: number; available: number } }>(
    "/withdrawals/summary"
  );
  return wallet;
};

export const initializePayment = async (
  email: string,
  amount: number,
  businessId: string,
  metadata?: {
    rating?: number;
    experience?: string;
    phone?: string;
    teamNumber?: string;
  }
) => {
  return api.initializePayment(email, amount, businessId, metadata);
};

export const verifyPayment = async (reference: string) => {
  return api.verifyPayment(reference);
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
