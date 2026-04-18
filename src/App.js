import React, { lazy, Suspense } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import "./App.css"

import LoadingSpinner from "./components/LoadingSpinner.js"
import ProtectedRoute from "./components/ProtectedRoute.js"
import AdminRoute from "./components/AdminRoute.js"

// ── Eagerly loaded (always needed on every page) ──
import Navbar from "./Pages/Navbar.js"
import Footer from "./Pages/Footer.js"

// ── Lazy-loaded page components ──
const Home = lazy(() => import("./Pages/Home.js"))
const Hero = lazy(() => import("./Pages/Hero.js"))
const Contact = lazy(() => import("./Pages/Contact.js"))
const AboutUs = lazy(() => import("./Pages/AboutUs.js"))
const Menu = lazy(() => import("./Pages/Menu.js"))
const Registration = lazy(() => import("./Pages/Registration.js"))
const Login = lazy(() => import("./Pages/Login.js"))
const Cart = lazy(() => import("./Pages/Cart.js"))
const Profile = lazy(() => import("./Pages/Profile.js"))
const OrderHistory = lazy(() => import("./Pages/OrderHistory.js"))
const OrderConfirmation = lazy(() => import("./Pages/OrderConfirmation.js"))
const Invoice = lazy(() => import("./Pages/Invoice.js"))
const AdminDashboard = lazy(() => import("./Pages/Admin/AdminDashboard.js"))
const AdminProducts = lazy(() => import("./Pages/Admin/AdminProducts.js"))
const AdminOrders = lazy(() => import("./Pages/Admin/AdminOrders.js"))
const AdminCustomers = lazy(() => import("./Pages/Admin/AdminCustomers.js"))

const App = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div>
      {!isAdminRoute && <Navbar />}

      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Registration />} />
          <Route path="/login" element={<Login />} />

          {/* After Login */}
          <Route path="/hero" element={<Hero />} />

          {/* Other public pages */}
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/menu" element={<Menu />} />

          {/* Protected — requires authentication */}
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
          <Route path="/orders/:id/invoice" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />

          {/* Admin — requires authentication + admin role */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
          <Route path="/admin/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
        </Routes>
      </Suspense>

      {!isAdminRoute && <Footer />}
    </div>
  )
}

export default App
