const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getToken = () => localStorage.getItem("ttt:token");

const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || "Something went wrong");
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

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: body ? JSON.stringify(body) : undefined,
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
  googleBusinessUrl?: string;
  menuQrCode?: string;
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
  bankName: string;
  bankCode?: string;
  accountName?: string;
  status: "COMPLETED" | "PENDING" | "APPROVED" | "REJECTED";
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

export const getPublicBusiness = async (id: string): Promise<Business | undefined> => {
  const response = await fetch(`${API_URL}/businesses/public/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    let errorMessage = "Business not found";
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch (e) {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  try {
    const { business } = await response.json();
    return business;
  } catch (e) {
    throw new Error("Invalid response from server");
  }
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

export const getMenus = async (businessId: string) => {
  const token = getToken();
  const response = await fetch(`${API_URL}/businesses/${businessId}/menus`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get menus");
  }
  
  const data = await response.json();
  return data.menus;
};

export const uploadMenu = async (businessId: string, file: File, name?: string) => {
  const formData = new FormData();
  formData.append('menu', file);
  if (name) {
    formData.append('name', name);
  }
  
  const token = getToken();
  const response = await fetch(`${API_URL}/businesses/${businessId}/menus`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload menu");
  }
  
  return response.json();
};

export const deleteMenu = async (businessId: string, menuId: string) => {
  const token = getToken();
  const response = await fetch(`${API_URL}/businesses/${businessId}/menus/${menuId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete menu");
  }
  
  return response.json();
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

export const requestWithdrawal = async (businessId: string, amount: number, accountNumber: string, bankName: string, bankCode?: string) => {
  return api.post<{ withdrawal: Withdrawal }>("/withdrawals/request", {
    businessId,
    amount,
    accountNumber,
    bankName,
    bankCode,
  }).then(data => data.withdrawal);
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

export const getSubscriptionStatus = async () => {
  return api.get<{ hasActiveSubscription: boolean; subscription?: any; canCreateBusiness: boolean }>("/subscriptions/status");
};

export const getSubscriptionPlans = async () => {
  return api.get<{ plans: any[] }>("/subscriptions/plans");
};

export const createSubscription = async (planType: string, paystackRef: string) => {
  return api.post<{ subscription: any }>("/subscriptions", { planType, paystackRef });
};

export const getUserSubscriptions = async () => {
  return api.get<{ subscriptions: any[] }>("/subscriptions");
};

export const cancelSubscription = async (subscriptionId: string) => {
  return api.patch<{ subscription: any }>(`/subscriptions/${subscriptionId}/cancel`);
};

export const getBanks = async () => {
  return api.get<{ banks: Array<{ id: string; name: string; code: string }> }>("/paystack/banks").then(data => data.banks);
};
