type ApiLoadErrorProps = {
  message?: string;
  className?: string;
};

export function ApiLoadError({
  message = "Could not reach kurae-api. Check that the API is running.",
  className = "",
}: ApiLoadErrorProps) {
  return (
    <div
      className={`rounded-lg border border-sakura-warning/40 bg-sakura-warning/5 p-6 text-center text-sm text-sakura-stone ${className}`}
      role="alert"
    >
      <p className="font-medium text-sakura-warning">{message}</p>
      <p className="mt-2 text-xs text-sakura-mist">
        Local dev:{" "}
        <code className="text-sakura-stone">cd kurae-api && docker compose up -d</code>
      </p>
    </div>
  );
}
