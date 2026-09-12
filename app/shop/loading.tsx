export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="pixel-panel h-8 w-24" />
        <div className="pixel-panel h-8 w-20" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="pixel-panel h-40" />
        <div className="pixel-panel h-40" />
        <div className="pixel-panel h-40" />
        <div className="pixel-panel h-40" />
      </div>
    </div>
  );
}
