export default function AchievementsLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-8 sm:px-6">
      <div className="pixel-panel h-8 w-48" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="pixel-panel h-24" />
        <div className="pixel-panel h-24" />
        <div className="pixel-panel h-24" />
        <div className="pixel-panel h-24" />
      </div>
    </div>
  );
}
