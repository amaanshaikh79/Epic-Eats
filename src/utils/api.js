// ──────────────────────────────────────────
// Epic Eats — Centralized API Utility
// ──────────────────────────────────────────

const BASE_URL = process.env.REACT_APP_API_URL || "";

// ──── Token Management ────
export const getToken = () => localStorage.getItem("epiceats_token");
export const setToken = (token) => localStorage.setItem("epiceats_token", token);
export const removeToken = () => {
    localStorage.removeItem("epiceats_token");
    localStorage.removeItem("epiceats_user");
};

// ──── User Data Management ────
export const getStoredUser = () => {
    const user = localStorage.getItem("epiceats_user");
    try {
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
};
export const setStoredUser = (user) => {
    localStorage.setItem("epiceats_user", JSON.stringify(user));
};

// ──── Check if user is logged in ────
export const isLoggedIn = () => !!getToken();

// ──── API Fetch Wrapper ────
export const apiFetch = async (endpoint, options = {}) => {
    const token = getToken();
    const { headers: customHeaders, ...restOptions } = options;

    const config = {
        ...restOptions,
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            ...customHeaders,
        },
    };

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong");
        }

        return data;
    } catch (error) {
        if (error.name === "TypeError" && error.message.includes("fetch")) {
            throw new Error("Unable to connect to server. Please check if the server is running.");
        }
        throw error;
    }
};

// Special fetch for FormData (image uploads — no Content-Type header)
export const apiFormFetch = async (endpoint, formData, method = "POST") => {
    const token = getToken();

    const config = {
        method,
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
    };

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, config);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Something went wrong");
        return data;
    } catch (error) {
        if (error.name === "TypeError" && error.message.includes("fetch")) {
            throw new Error("Unable to connect to server.");
        }
        throw error;
    }
};

// ──── Auth API ────
export const registerUser = (userData) =>
    apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(userData) });

export const loginUser = (credentials) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) });

export const getProfile = () => apiFetch("/api/auth/me");

export const updateProfile = (data) =>
    apiFetch("/api/auth/profile", { method: "PUT", body: JSON.stringify(data) });

export const addAddress = (data) =>
    apiFetch("/api/auth/address", { method: "POST", body: JSON.stringify(data) });

export const editAddress = (addressId, data) =>
    apiFetch(`/api/auth/address/${addressId}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteAddress = (addressId) =>
    apiFetch(`/api/auth/address/${addressId}`, { method: "DELETE" });

// ──── Menu API ────
export const getMenuItems = (params) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== "All") query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", params.page);
    if (params?.limit) query.set("limit", params.limit);
    const qs = query.toString();
    return apiFetch(`/api/menu${qs ? `?${qs}` : ""}`);
};

export const getMenuItem = (id) => apiFetch(`/api/menu/${id}`);

// ──── Order API ────
export const createOrder = (orderData) =>
    apiFetch("/api/orders", { method: "POST", body: JSON.stringify(orderData) });

export const getMyOrders = () => apiFetch("/api/orders");

export const getOrder = (id) => apiFetch(`/api/orders/${id}`);

// ──── Contact API ────
export const submitContact = (formData) =>
    apiFetch("/api/contact", { method: "POST", body: JSON.stringify(formData) });

// ──── Admin API ────
export const adminGetStats = () => apiFetch("/api/admin/stats");

export const adminGetProducts = (params) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
    if (params?.page) query.set("page", params.page);
    const qs = query.toString();
    return apiFetch(`/api/admin/products${qs ? `?${qs}` : ""}`);
};

export const adminCreateProduct = (formData) =>
    apiFormFetch("/api/admin/products", formData, "POST");

export const adminUpdateProduct = (id, formData) =>
    apiFormFetch(`/api/admin/products/${id}`, formData, "PUT");

export const adminDeleteProduct = (id) =>
    apiFetch(`/api/admin/products/${id}`, { method: "DELETE" });

export const adminGetOrders = (params) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", params.page);
    const qs = query.toString();
    return apiFetch(`/api/admin/orders${qs ? `?${qs}` : ""}`);
};

export const adminUpdateOrderStatus = (id, status) =>
    apiFetch(`/api/admin/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
