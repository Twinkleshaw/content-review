import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import CreateContent from "./pages/CreateContent";
import ContentDetail from "./pages/ContentDetail";
import { useUser } from "./context/UserContext";

export default function App() {
  const { loading } = useUser();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>
        Loading…
      </div>
    );
  }

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateContent />} />
        <Route path="/edit/:id" element={<CreateContent />} />
        <Route path="/content/:id" element={<ContentDetail />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
