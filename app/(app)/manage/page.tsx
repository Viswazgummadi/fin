import { ManageGrid } from '../../../components/ManageGrid';

export default function ManagePage() {
  return (
    <div className="space-y-6 fade-up">
      <div className="page-header">
        <h1 className="page-title">Manage</h1>
        <p className="page-copy">Configure accounts, structure, and quick-spend shortcuts.</p>
      </div>

      <ManageGrid />
    </div>
  );
}
