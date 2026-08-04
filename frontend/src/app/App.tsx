import { useQuery } from "@tanstack/react-query";

async function fetchHealth(): Promise<{ status: string }> {
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error(`Backend health check failed: ${response.status}`);
  }
  return response.json();
}

export function App() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">HobbyHub</h1>
        <p className="mt-2 text-slate-400">
          Milestone 0 scaffold — backend status:{" "}
          {isLoading && "checking..."}
          {isError && "unreachable"}
          {data && data.status}
        </p>
      </div>
    </main>
  );
}
