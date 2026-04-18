// ──────────────────────────────────────────
// Epic Eats — Centralized API Utility
// ──────────────────────────────────────────

const BASE_URL = process.env.REACT_APP_API_URL || "";

// ──── Token Management ────
export const getToken = () => localStorage.getItem("epiceats_access_token");
export const getRefreshToken = () => localStorage.getItem("epiceats_refresh_token");

export const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem("epiceats_access_token", accessToken);
    localStorage.setItem("epiceats_refresh_token", refreshToken);
};

// Backward-compatible single-token setter (maps to access token)
export const setToken = (token) => localStorage.setItem("epiceats_access_token", token);

export const removeToken = () => {
    localStorage.removeItem("epiceats_access_token");
    localStorage.removeItem("epiceats_refresh_token");
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
export const isLoggedIn = () => {
    // User is considered logged in if we have a valid refresh token
    // (access token may be expired — it will auto-refresh)
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    return isTokenValid(refreshToken);
};

// ──── JWT Token Validation ────
export const isTokenValid = (token) => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Check if token has expired (exp is in seconds)
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
};

// ──── Get token expiry time remaining (in ms) ────
export const getTokenExpiry = () => {
    const token = getToken();
    if (!token) return 0;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp ? (payload.exp * 1000) - Date.now() : 0;
    } catch {
        return 0;
    }
};

// ──── Refresh Access Token ────
let refreshPromise = null; // Deduplicate concurrent refresh calls

export const refreshAccessToken = async () => {
    // If a refresh is already in progress, return the same promise
    if (refreshPromise) return refreshPromise;

    const refreshToken = getRefreshToken();
    if (!refreshToken || !isTokenValid(refreshToken)) {
        removeToken();
        return null;
    }

    refreshPromise = (async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                removeToken();
                return null;
            }

            // Store new tokens
            setTokens(data.accessToken, data.refreshToken);
            return data.accessToken;
        } catch {
            removeToken();
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
};

// ──── API Fetch Wrapper ────
export const apiFetch = async (endpoint, options = {}, _isRetry = false) => {
    let token = getToken();

    // If access token is expired but we have a refresh token, refresh first
    if (token && !isTokenValid(token) && !_isRetry) {
        token = await refreshAccessToken();
        if (!token) {
            // Refresh failed — redirect to login
            if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
                window.location.href = '/login';
            }
            throw new Error("Session expired. Please login again.");
        }
    }

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
            // On 401, try refreshing the access token and retry ONCE
            if (response.status === 401 && !_isRetry) {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    // Retry the original request with the new token
                    return apiFetch(endpoint, options, true);
                }
                // Refresh failed — logout
                removeToken();
                if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
                    window.location.href = '/login';
                }
            }
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
export const apiFormFetch = async (endpoint, formData, method = "POST", _isRetry = false) => {
    let token = getToken();

    // Pre-refresh if access token is expired
    if (token && !isTokenValid(token) && !_isRetry) {
        token = await refreshAccessToken();
    }

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

        if (!response.ok) {
            // On 401, try refreshing and retry ONCE
            if (response.status === 401 && !_isRetry) {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    return apiFormFetch(endpoint, formData, method, true);
                }
                removeToken();
            }
            throw new Error(data.message || "Something went wrong");
        }

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

export const logoutUser = () =>
    apiFetch("/api/auth/logout", { method: "POST" });

export const getProfile = () => apiFetch("/api/auth/me");

export const sendOTP = (phone) =>
    apiFetch("/api/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) });

export const verifyOTP = (phone, otp) =>
    apiFetch("/api/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, otp }) });

export const sendEmailOTP = (email) =>
    apiFetch("/api/auth/send-email-otp", { method: "POST", body: JSON.stringify({ email }) });

export const verifyEmailOTP = (email, otp) =>
    apiFetch("/api/auth/verify-email-otp", { method: "POST", body: JSON.stringify({ email, otp }) });

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

export const verifyPayment = (paymentData) =>
    apiFetch("/api/orders/verify", { method: "POST", body: JSON.stringify(paymentData) });

export const getMyOrders = () => apiFetch("/api/orders");

export const getOrder = (id) => apiFetch(`/api/orders/${id}`);

export const getInvoice = (id) => apiFetch(`/api/orders/${id}/invoice`);

// ──── Contact API ────
export const submitContact = (formData) =>
    apiFetch("/api/contact", { method: "POST", body: JSON.stringify(formData) });

// ──── Admin API ────
export const adminGetStats = () => apiFetch("/api/admin/stats");

export const adminGetUsers = (params) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", params.page);
    const qs = query.toString();
    return apiFetch(`/api/admin/users${qs ? `?${qs}` : ""}`);
};

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
