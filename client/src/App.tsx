import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-6 text-2xl font-bold text-center">NexLead Hunter</h1>
          <p className="text-gray-700">
            Welcome to the NexLead Hunter application. This is a debugging version to check if React is working properly.
          </p>
          <div className="mt-4 flex justify-center">
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              onClick={() => alert('React is working!')}
            >
              Click me
            </button>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
