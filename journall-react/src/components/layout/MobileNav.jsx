import { useNavigate } from 'react-router-dom';

export function MobileNav({ views }) {
  const navigate = useNavigate();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex justify-around border-t border-terminal-border bg-background px-2 py-2">
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          onClick={() => navigate(view.path)}
          className="flex flex-col items-center gap-1 p-2 text-muted hover:text-foreground"
        >
          <span className="font-mono text-[10px]">{view.shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
