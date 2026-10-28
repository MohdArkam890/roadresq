import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * EXPERIMENT 6 (roles) applied on the frontend
 * -----------------------------------------------
 * Redirects to /login if nobody's signed in, and away from a
 * role-specific page (e.g. a customer hitting /mechanic) if the
 * logged-in account is the wrong role. The backend enforces the real
 * security boundary via authorize(...roles) — this is just so the UI
 * doesn't show a broken, 401-riddled page in the meantime.
 */
export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
