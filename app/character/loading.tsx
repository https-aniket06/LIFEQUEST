export default function CharacterLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-8 sm:px-6">
      <div className="pixel-panel h-40" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="pixel-panel h-36" />
        <div className="pixel-panel h-36" />
      </div>
      <div className="pixel-panel mt-6 h-24" />
    </div>
  );
}
