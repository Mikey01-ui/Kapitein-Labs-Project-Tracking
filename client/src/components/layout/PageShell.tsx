import type { ReactNode } from "react";

interface PageShellProps {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  hideHeader?: boolean;
}

export function PageShell({ title, eyebrow, actions, children, hideHeader = false }: PageShellProps) {
  return (
    <div className="space-y-6">
      {!hideHeader && (
        <header className="flex flex-col gap-4 border-b border-dashed border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow ? <p className="text-sm font-medium text-teal">{eyebrow}</p> : null}
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h2>
          </div>
          {actions ? <div>{actions}</div> : null}
        </header>
      )}
      {children}
    </div>
  );
}
