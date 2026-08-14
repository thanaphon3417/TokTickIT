import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  void categories;

  async function handleCheck() {
    // TODO(Issue 4): set loading, call checkSystem(), then either
    //   - success: store categories and show Online + the list, or
    //   - error: show Offline + a useful message.
    setState("loading");
    setCategories([]);
    setErrorMessage("");

    try {
      const systemStatus = await checkSystem();

      setCategories(systemStatus.categories);
      setState("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to TokTickIT API.",
      );
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {/* TODO(Issue 4): render loading / success (Online + categories) / error (Offline) states. */}
      {state === "loading" && (
        <p className="mt-4" role="status">
          Loading...
        </p>
      )}

      {state === "success" && (
        <section className="mt-4">
          <p>
            System Status: <strong>Online</strong>
          </p>

          <h2 className="h5 mt-4">Supported Request Categories</h2>

          <ol>
            {categories.map((category) => (
              <li key={category.id}>{category.name}</li>
            ))}
          </ol>
        </section>
      )}

      {state === "error" && (
        <div className="alert alert-danger mt-4" role="alert">
          <p className="mb-1">
            System Status: <strong>Offline</strong>
          </p>
          <p className="mb-0">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
