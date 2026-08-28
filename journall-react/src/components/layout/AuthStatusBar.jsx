import { useAuth } from '../../hooks/useAuth';

export function AuthStatusBar() {
  const { user, loading, error, signInWithGoogle } = useAuth();

  if (loading) return <div className="text-muted text-[10px]">LOADING...</div>;
  if (error) return <div className="text-loss text-[10px]">AUTH ERROR</div>;

  return (
    <div className="flex items-center gap-4">
      {user ? (
        <div className="text-profit text-[10px] font-mono">SIGNED IN</div>
      ) : (
        <button
          onClick={signInWithGoogle}
          className="text-primary text-[10px] font-mono hover:underline"
        >
          SIGN IN
        </button>
      )}
    </div>
  );
}
