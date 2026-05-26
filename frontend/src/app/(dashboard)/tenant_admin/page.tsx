export default function TenantAdminPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-6">
      <div className="max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm text-center">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Tenant Admin</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Workspace migration in progress</h1>
        <p className="mt-3 text-sm text-slate-500">This legacy workspace is being moved into the new multi-page shell.</p>
      </div>
    </div>
  );
}
