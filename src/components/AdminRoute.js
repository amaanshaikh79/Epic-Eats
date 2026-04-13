import { Navigate } from "react-router-dom"
import { isLoggedIn, getStoredUser } from "../utils/api.js"

const AdminRoute = ({ children }) => {
  const user = getStoredUser()

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
