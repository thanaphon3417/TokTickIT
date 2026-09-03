import { useEffect, useState } from "react";
import { DevelopmentRequester, getActiveRequesters } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "loading" | "success" | "empty" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("loading");
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadRequesters() {
    setState("loading");
    setErrorMessage("");

    try {
      const activeRequesters = await getActiveRequesters();
      setRequesters(activeRequesters);
      setSelectedId(localStorage.getItem("toktickit.requesterId") ?? "");
      setState(activeRequesters.length === 0 ? "empty" : "success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to retrieve active development requesters.",
      );
      setState("error");
    }
  }

  useEffect(() => {
    void loadRequesters();
  }, []);

  function handleContinue() {
    if (selectedId) {
      localStorage.setItem("toktickit.requesterId", selectedId);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-3">TokTickIT</h1>
      <h2 className="h4 mb-2">Select Development Requester</h2>
      <p>This is a Lab 2 testing selector, not a login screen.</p>

      {state === "loading" && (
        <p className="mt-4" role="status">
          Loading active requesters...
        </p>
      )}

      {state === "success" && (
        <form onSubmit={(event) => { event.preventDefault(); handleContinue(); }}>
          <label className="form-label" htmlFor="requester">
            Development Requester <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            id="requester"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            required
          >
            <option value="">Select a requester</option>
            {requesters.map((requester) => (
              <option key={requester.id} value={requester.id}>
                {requester.name} ({requester.email})
              </option>
            ))}
          </select>
          <button className="btn btn-success mt-3" type="submit" disabled={!selectedId}>
            Continue
          </button>
        </form>
      )}

      {state === "empty" && (
        <p className="alert alert-warning mt-4" role="status">
          No active development requesters are available.
        </p>
      )}

      {state === "error" && (
        <div className="alert alert-danger mt-4" role="alert">
          <p className="mb-2">{errorMessage}</p>
          <button className="btn btn-outline-danger" type="button" onClick={() => void loadRequesters()}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
