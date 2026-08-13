type Item = {
  title: string;
  description: string;
};

export function SectionPage({ title, description, items }: { title: string; description: string; items: Item[] }) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-xl border border-border bg-bg-secondary p-4">
            <h2 className="font-medium">{item.title}</h2>
            <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
