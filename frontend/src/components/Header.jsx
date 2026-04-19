import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const ROLE_COLORS = {
  creator: { bg: "#e0e7ff", color: "#3730a3" },
  editor: { bg: "#dcfce7", color: "#166534" },
  approver: { bg: "#fef3c7", color: "#92400e" },
};

export default function Header() {
  const { currentUser, users, switchUser } = useUser();
  const navigate = useNavigate();
  

  return (
    <header style={{
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "0 24px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28,
            background: "var(--accent)",
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h8M2 12h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>
            ContentFlow
          </span>
        </Link>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {currentUser?.role === "creator" && (
            <button
              className="btn-primary"
              style={{ padding: "6px 14px", fontSize: 13 }}
              onClick={() => navigate("/create")}
            >
              + New Content
            </button>
          )}

          {/* Role Switcher */}
          {/* {currentUser && ( */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Viewing as</span>
            <div style={{ position: "relative" }}>
              <select
                value={currentUser?._id}
                onChange={(e) => switchUser(e.target.value)}
                style={{
                  padding: "5px 32px 5px 10px",
                  width: "auto",
                  fontWeight: 500,
                  fontSize: 13,
                  appearance: "none",
                  background: ROLE_COLORS[currentUser?.role]?.bg,
                  color: ROLE_COLORS[currentUser?.role]?.color,
                  border: "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                {users.map((u) => (
                  <option key={u?._id} value={u?._id}>
                    {u?.name} — {u?.role}
                  </option>
                ))}
              </select>
              <svg
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                width="12" height="12" viewBox="0 0 12 12" fill="none"
              >
                <path d="M2 4l4 4 4-4" stroke={ROLE_COLORS[currentUser?.role]?.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          {/* )} */}

        </div>
      </div>
    </header>
  );
}
