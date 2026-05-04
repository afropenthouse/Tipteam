const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getToken = () => localStorage.getItem("ttt:token");

const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data;
};

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return handleResponse(res);
  },

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async delete<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return handleResponse(res);
  },
};

export type User = {
  id: string;
  fullName: string;
  email: string;
  isVerified: boolean;
  avatarUrl?: string;
  createdAt?: string;
};

export type Business = {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt?: string;
};

export type Feedback = {
  id: string;
  businessId: string;
  rating?: number | null;
  experience?: string;
  phone?: string;
  tipAmount: number;
  paystackRef?: string;
  createdAt: string;
  updatedAt?: string;
};

export type Withdrawal = {
  id: string;
  businessId: string;
  amount: number;
  accountNumber: string;
  status: "AWAITING_CONFIRMATION" | "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt?: string;
  business?: { name: string };
};

export const signUp = async (input: { fullName: string; email: string; password: string }) => {
  const { user, token } = await api.post<{ user: User; token: string }>("/auth/signup", input);
  localStorage.setItem("ttt:token", token);
  localStorage.setItem("ttt:user", JSON.stringify(user));
  return user;
};

export const signIn = async (email: string, password: string) => {
  const { user, token } = await api.post<{ user: User; token: string }>("/auth/login", { email, password });
  localStorage.setItem("ttt:token", token);
  localStorage.setItem("ttt:user", JSON.stringify(user));
  return user;
};

export const signOut = () => {
  localStorage.removeItem("ttt:token");
  localStorage.removeItem("ttt:user");
  window.dispatchEvent(new CustomEvent("ttt:store"));
};

export const getCurrentUser = (): User | null => {
  const raw = localStorage.getItem("ttt:user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const updateUser = async (patch: Partial<User>) => {
  const user = getCurrentUser();
  if (!user) return;
  const updated = { ...user, ...patch };
  localStorage.setItem("ttt:user", JSON.stringify(updated));
};

export const verifyEmail = async (email: string, code: string) => {
  return api.post<{ message: string }>("/auth/verify-email", { email, code });
};

export const forgotPassword = async (email: string) => {
  return api.post<{ message: string }>("/auth/forgot-password", { email });
};

export const resetPassword = async (email: string, code: string, password: string) => {
  return api.post<{ message: string }>("/auth/reset-password", { email, code, password });
};

export const forgotPasswordDirect = async (email: string, password: string) => {
  return api.post<{ message: string }>("/auth/forgot-password-direct", { email, password });
};

export const listBusinesses = async (): Promise<Business[]> => {
  const { businesses } = await api.get<{ businesses: Business[] }>("/businesses");
  return businesses;
};

export const getBusiness = async (id: string): Promise<Business | undefined> => {
  const { business } = await api.get<{ business: Business }>(`/businesses/${id}`);
  return business;
};

export const createBusiness = async (data: Omit<Business, "id" | "ownerId" | "createdAt">): Promise<Business> => {
  const { business } = await api.post<{ business: Business }>("/businesses", data);
  return business;
};

export const updateBusiness = async (id: string, patch: Partial<Business>) => {
  const { business } = await api.put<{ business: Business }>(`/businesses/${id}`, patch);
  return business;
};

export const deleteBusiness = async (id: string) => {
  return api.delete<{ message: string }>(`/businesses/${id}`);
};

export const listFeedback = async (businessId?: string): Promise<Feedback[]> => {
  if (businessId) {
    const { feedbacks } = await api.get<{ feedbacks: Feedback[] }>(`/feedback/${businessId}`);
    return feedbacks;
  }
  return [];
};

export const addFeedback = async (input: Omit<Feedback, "id" | "createdAt" | "updatedAt">): Promise<Feedback> => {
  const { feedback } = await api.post<{ feedback: Feedback }>("/feedback", input);
  return feedback;
};

export const listWithdrawals = async (businessId?: string): Promise<Withdrawal[]> => {
  if (businessId) {
    const { withdrawals } = await api.get<{ withdrawals: Withdrawal[] }>(`/withdrawals/business/${businessId}`);
    return withdrawals;
  }
  const { withdrawals } = await api.get<{ withdrawals: Withdrawal[] }>("/withdrawals");
  return withdrawals;
};

export const requestWithdrawal = async (businessId: string, amount: number, accountNumber: string, bankName: string) => {
  return api.post<{ message: string; withdrawalId: string }>("/withdrawals/request", {
    businessId,
    amount,
    accountNumber,
    bankName,
  });
};

export const confirmWithdrawal = async (withdrawalId: string, code: string): Promise<Withdrawal> => {
  const { withdrawal } = await api.post<{ message: string; withdrawal: Withdrawal }>("/withdrawals/confirm", {
    withdrawalId,
    code,
  });
  return withdrawal;
};

export const walletBalance = async (businessId: string) => {
  const { wallet } = await api.get<{ wallet: { earned: number; withdrawn: number; available: number } }>(
    `/withdrawals/business/${businessId}`
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
  return api.post<{ authorizationUrl: string; reference: string }>("/paystack/initialize", {
    email,
    amount,
    businessId,
    ...metadata,
  });
};

export const verifyPayment = async (reference: string) => {
  return api.post<{ success: boolean; amount: number }>("/paystack/verify", { reference });
};
