import { BackLink } from './BackLink';

type Row = { title: string; subtitle?: string };

export function CrudPage({
  title,
  description,
  rows,
  children,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  rows: Row[];
  children?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="space-y-6 fade-up">
      <div className="page-header">
        {backHref ? <BackLink href={backHref} label={backLabel ?? 'Back'} /> : null}
        <h1 className="page-title">{title}</h1>
        <p className="page-copy">{description}</p>
      </div>
      {children}
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.title} className="surface-card p-4">
              <div className="font-medium">{row.title}</div>
              {row.subtitle ? <div className="mt-1 text-sm text-[--text-secondary]">{row.subtitle}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
