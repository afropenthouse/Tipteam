import { Business, Feedback, User } from "./api";

const API_URL = import.meta.env.VITE_API_URL;

const getAdminToken = () => localStorage.getItem("ttt:admin:token");

const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || "Something went wrong");
  }
  return data;
};

export interface AdminStats {
  totalUsers: number;
  totalBusinesses: number;
  totalFeedback: number;
  activeSubscriptions: number;
  totalTipsEarned: number;
}

export interface AdminUser extends User {
  businessCount: number;
  feedbackCount: number;
  hasActiveSubscription: boolean;
  subscriptionExpiresAt: string | null;
}

class AdminApi {
  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_URL}/admin${endpoint}`, {
      headers: {
        Authorization: `Bearer ${getAdminToken()}`,
      },
    });
    return handleResponse(res);
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}/admin${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAdminToken()}`,
      },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  }

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}/admin${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAdminToken()}`,
      },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}/admin${endpoint}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAdminToken()}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_URL}/admin${endpoint}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getAdminToken()}`,
      },
    });
    return handleResponse(res);
  }

  // Dashboard stats
  getDashboardStats() {
    return this.get<{ stats: AdminStats }>("/dashboard-stats");
  }

  // Users
  getUsers() {
    return this.get<{ users: AdminUser[] }>("/users");
  }

  getUser(id: string) {
    return this.get<{ user: any }>(`/users/${id}`);
  }

  toggleUser(id: string) {
    return this.patch<{ user: User }>(`/users/${id}/toggle`);
  }

  // Businesses
  getBusinesses() {
    return this.get<{ businesses: Business[] }>("/businesses");
  }

  getBusiness(id: string) {
    return this.get<{ business: Business; wallet: any }>(`/businesses/${id}`);
  }

  updateBusiness(id: string, data: any) {
    return this.put<{ business: Business }>(`/businesses/${id}`, data);
  }

  deleteBusiness(id: string) {
    return this.delete<{ message: string }>(`/businesses/${id}`);
  }

  // Transactions
  getTransactions(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params) {
      if (params.page) query.set("page", String(params.page));
      if (params.limit) query.set("limit", String(params.limit));
      if (params.search) query.set("search", params.search);
    }
    const qs = query.toString();
    return this.get<{ transactions: any[]; total: number; page: number; pages: number }>(
      `/transactions${qs ? "?" + qs : ""}`
    );
  }

  deleteUser(id: string) {
    return this.delete<{ message: string }>(`/users/${id}`);
  }

  // Feedback
  getFeedback(params?: { page?: number; limit?: number; businessId?: string; rating?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params) {
      if (params.page) query.set("page", String(params.page));
      if (params.limit) query.set("limit", String(params.limit));
      if (params.businessId) query.set("businessId", params.businessId);
      if (params.rating) query.set("rating", String(params.rating));
      if (params.search) query.set("search", params.search);
    }
    const qs = query.toString();
    return this.get<{ feedback: Feedback[]; total: number; page: number; limit: number; pages: number }>(
      `/feedback${qs ? "?" + qs : ""}`
    );
  }

  getBusinessFeedback(businessId: string, page = 1, limit = 50) {
    return this.get<{ feedback: Feedback[]; total: number }>(`/feedback/${businessId}?page=${page}&limit=${limit}`);
  }

  deleteFeedback(id: string) {
    return this.delete<{ message: string }>(`/feedback/${id}`);
  }
}

export const adminApi = new AdminApi();

export const isAdminLoggedIn = () => !!localStorage.getItem("ttt:admin:token");

export const adminSignOut = () => {
  localStorage.removeItem("ttt:admin:token");
  localStorage.removeItem("ttt:admin:user");
};