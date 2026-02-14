import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import SupabaseCheck from "./components/SupabaseCheck.tsx";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<p>Erreur: élément #root introuvable.</p>";
} else {
  createRoot(rootEl).render(
    <RootErrorBoundary>
      <SupabaseCheck>
        <App />
      </SupabaseCheck>
    </RootErrorBoundary>
  );
}
