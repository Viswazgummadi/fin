type Row = { title: string; subtitle?: string };

export function CrudPage({
  title,
  description,
  rows,
  children,
}: {
  title: string;
  description: string;
  rows: Row[];
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">{description}</p>
      </div>
      {children}
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.title} className="rounded-xl border border-border bg-bg-secondary p-4">
            <div className="font-medium">{row.title}</div>
            {row.subtitle ? <div className="mt-1 text-sm text-text-secondary">{row.subtitle}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
