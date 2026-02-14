import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Affiche une erreur lisible si l'app plante au chargement (au lieu d'une page blanche).
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[RootErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "#f5f5f5",
          }}
        >
          <div
            style={{
              maxWidth: 480,
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h1 style={{ color: "#b91c1c", marginTop: 0 }}>Erreur au chargement</h1>
            <p style={{ color: "#374151" }}>
              L’application n’a pas pu démarrer. Vérifiez la console (F12) pour les détails.
            </p>
            <pre
              style={{
                background: "#fef2f2",
                padding: 12,
                borderRadius: 4,
                fontSize: 12,
                overflow: "auto",
                maxHeight: 200,
              }}
            >
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16,
                padding: "8px 16px",
                background: "#006A4E",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
