export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <div className="pixel-panel h-40 p-5" />
          <div className="pixel-panel h-48 p-5" />
        </div>
        <div className="space-y-3">
          <div className="pixel-panel h-16" />
          <div className="pixel-panel h-16" />
          <div className="pixel-panel h-16" />
        </div>
      </div>
    </div>
  );
}
