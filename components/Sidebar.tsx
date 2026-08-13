const links = [
  ['Dashboard', '/dashboard'],
  ['Add', '/add'],
  ['Transactions', '/transactions'],
  ['People', '/people'],
  ['Goals', '/goals'],
  ['Limits', '/limits'],
  ['Analysis', '/analysis'],
  ['Calendar', '/calendar'],
  ['Forecast', '/forecast'],
  ['Accounts', '/accounts'],
  ['Categories', '/categories'],
  ['Settings', '/settings'],
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 border-r border-border bg-bg-secondary p-4 lg:block">
      <div className="mb-6">
        <div className="text-sm text-text-secondary">Private money journal</div>
        <div className="font-mono text-xl">₹0.00</div>
      </div>
      <nav className="space-y-1">
        {links.map(([label, href]) => (
          <a key={label} href={href} className="block rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary">
            {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
