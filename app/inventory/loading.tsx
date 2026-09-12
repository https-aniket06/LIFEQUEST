export default function InventoryLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-8 sm:px-6">
      <div className="pixel-panel h-8 w-32" />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="pixel-panel h-36" />
        <div className="pixel-panel h-36" />
        <div className="pixel-panel h-36" />
      </div>
    </div>
  );
}
