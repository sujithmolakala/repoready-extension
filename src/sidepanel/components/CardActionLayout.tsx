import type { ReactNode } from "react";

export function CardActionLayout({
  content,
  actions,
}: {
  content: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      data-testid="card-action-layout"
    >
      <div className="min-w-0 flex-1">{content}</div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap items-start gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
