import { useAuth } from '../../hooks/useAuth';

export function AuthGate({ children }) {
  const { user, loading, error } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>Please sign in to continue.</div>;

  return <>{children}</>;
}
