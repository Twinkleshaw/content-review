import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import StatusBadge from "../components/StatusBadge";
import { useUser } from "../context/UserContext";
import { getContents } from "../services/content.service";
import { getSubContentsByParent } from "../services/subcontent.service";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "In Review", value: "in_review" },
  { label: "In Approval", value: "in_approval" },
  { label: "Published", value: "published" },
];

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Dashboard() {
  const [contents, setContents] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subContentCounts, setSubContentCounts] = useState({
    in_review: 0,
    in_approval: 0,
  });
  const { currentUser } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    fetchContents();
  }, [filter]);

  // Once parent contents load, scan all sub-content to count pending items for reviewers
  useEffect(() => {
    if (!currentUser || currentUser.role === "creator") return;
    if (contents.length === 0) {
      setSubContentCounts({ in_review: 0, in_approval: 0 });
      return;
    }
    fetchSubContentCounts();
  }, [contents, currentUser]);

  const fetchContents = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getContents(filter);
      setContents(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load content.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubContentCounts = async () => {
    try {
      const results = await Promise.all(
        contents.map((c) =>
          getSubContentsByParent(c._id)
            .then((r) => r.data)
            .catch(() => []),
        ),
      );
      const all = results.flat();
      setSubContentCounts({
        in_review: all.filter((s) => s.status === "in_review").length,
        in_approval: all.filter((s) => s.status === "in_approval").length,
      });
    } catch {
      // non-critical
    }
  };

  const getRoleHint = () => {
    if (!currentUser) return null;
    if (currentUser.role === "editor")
      return { status: "in_review", label: "waiting for your review" };
    if (currentUser.role === "approver")
      return { status: "in_approval", label: "waiting for your approval" };
    return null;
  };

  const hint = getRoleHint();
  const parentActionableCount = hint
    ? contents.filter((c) => c.status === hint.status).length
    : 0;
  const subActionableCount = hint ? subContentCounts[hint.status] || 0 : 0;
  const actionableCount = parentActionableCount + subActionableCount;

  return (
    <div className="page">
      {/* Role-aware action banner — now includes sub-content counts */}
      {hint && actionableCount > 0 && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "var(--radius)",
            padding: "10px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13,
          }}
        >
          <span style={{ color: "#1d4ed8" }}>
            <strong>
              {actionableCount} item{actionableCount > 1 ? "s" : ""}
            </strong>{" "}
            {hint.label}
            {subActionableCount > 0 && parentActionableCount > 0 && (
              <span style={{ color: "#3b82f6", marginLeft: 6 }}>
                ({parentActionableCount} content, {subActionableCount}{" "}
                sub-content)
              </span>
            )}
            {subActionableCount > 0 && parentActionableCount === 0 && (
              <span style={{ color: "#3b82f6", marginLeft: 6 }}>
                (in sub-content — click View to find the parent)
              </span>
            )}
          </span>
          <button
            className="btn-ghost"
            style={{ padding: "4px 12px", fontSize: 12 }}
            onClick={() => {
              if (subActionableCount > 0 && parentActionableCount === 0) {
                setFilter("");
              } else {
                setFilter(hint.status);
              }
            }}
          >
            View →
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Content</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
            {contents.length} item{contents.length !== 1 ? "s" : ""}
            {filter
              ? ` · filtered by "${FILTERS.find((f) => f.value === filter)?.label}"`
              : ""}
          </p>
        </div>
        {currentUser?.role === "creator" && (
          <button className="btn-primary" onClick={() => navigate("/create")}>
            + New Content
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 4,
          marginBottom: 16,
          width: "fit-content",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              background: filter === f.value ? "var(--accent)" : "transparent",
              color: filter === f.value ? "#fff" : "var(--text-secondary)",
              padding: "5px 12px",
              fontSize: 13,
              borderRadius: 6,
              fontWeight: filter === f.value ? 500 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "var(--danger-bg)",
            color: "var(--danger)",
            padding: "10px 14px",
            borderRadius: "var(--radius)",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Content list */}
      {loading ? (
        <div
          style={{
            color: "var(--text-muted)",
            padding: "40px 0",
            textAlign: "center",
          }}
        >
          Loading...
        </div>
      ) : contents.length === 0 ? (
        <div
          style={{
            color: "var(--text-muted)",
            padding: "60px 0",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
          <div>No content found</div>
          {currentUser?.role === "creator" && (
            <button
              className="btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => navigate("/create")}
            >
              Create your first piece
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {contents.map((item) => (
            <ContentRow
              key={item._id}
              item={item}
              currentUser={currentUser}
              subPendingCount={
                // Show a sub-content pending badge on each row for reviewers
                currentUser?.role === "editor" ||
                currentUser?.role === "approver"
                  ? null // loaded per-card only if needed — avoid extra fetches on list
                  : null
              }
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentRow({ item, currentUser, navigate }) {
  const [subPending, setSubPending] = useState(null);

  useEffect(() => {
    if (!currentUser || currentUser.role === "creator") return;

    getSubContentsByParent(item._id)
      .then((res) => {
        const targetStatus =
          currentUser.role === "editor" ? "in_review" : "in_approval";

        const count = res.data.filter((s) => s.status === targetStatus).length;

        if (count > 0) setSubPending(count);
      })
      .catch(() => {});
  }, [item._id, currentUser]);

  return (
    <div
      className="card"
      onClick={() => navigate(`/content/${item._id}`)}
      style={{
        padding: "14px 18px",
        cursor: "pointer",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.borderColor = "#cbd5e0";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div className="flex-between">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontWeight: 500,
                fontSize: 15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.title}
            </span>
            {item.version > 1 && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  background: "#f1f5f9",
                  padding: "1px 7px",
                  borderRadius: 10,
                  flexShrink: 0,
                }}
              >
                v{item.version}
              </span>
            )}
            {/* Sub-content pending badge */}
            {subPending && (
              <span
                style={{
                  fontSize: 11,
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  padding: "1px 7px",
                  borderRadius: 10,
                  flexShrink: 0,
                  fontWeight: 500,
                }}
              >
                {subPending} sub-content pending
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            <span>by {item.createdBy?.name}</span>
            <span>·</span>
            <span>{timeAgo(item.updatedAt)}</span>
            {item.tags?.length > 0 && (
              <>
                <span>·</span>
                <span>
                  {item.tags.slice(0, 2).join(", ")}
                  {item.tags.length > 2 ? ` +${item.tags.length - 2}` : ""}
                </span>
              </>
            )}
          </div>
          {item.status === "draft" &&
            item.lastRejectionComment &&
            currentUser?.role === "creator" && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#9b2c2c",
                  background: "var(--danger-bg)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  display: "inline-block",
                }}
              >
                Rejected: "{item.lastRejectionComment}"
              </div>
            )}
        </div>
        <div style={{ marginLeft: 16, flexShrink: 0 }}>
          <StatusBadge status={item.status} />
        </div>
      </div>
    </div>
  );
}
