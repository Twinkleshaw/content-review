import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import SubContentSection from "../components/SubContentSection";
import { useUser } from "../context/UserContext";
import {
  approveContent,
  deleteContent,
  getContentById,
  reviewContent,
  submitContent,
} from "../services/content.service";

function Avatar({ name }) {
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "var(--accent)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The approve/reject action panel for reviewers
function ActionPanel({ contentId, stage, onDone }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const stageLabel = stage === "stage1" ? "Editor review" : "Final approval";

  const handleAction = async (action) => {
    if (action === "reject" && !comment.trim()) {
      return setError("Please provide a reason for rejection.");
    }

    setLoading(true);
    setError("");

    try {
      let res;

      if (stage === "stage1") {
        res = await reviewContent(contentId, { action, comment });
      } else {
        res = await approveContent(contentId, { action, comment });
      }

      onDone(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Action failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="card"
      style={{ padding: 20, borderLeft: "3px solid var(--accent)" }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>
        Your Action Required
      </div>
      <div
        style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}
      >
        {stageLabel} — approve to advance or reject to send back for revision
      </div>

      <textarea
        placeholder="Comment (required if rejecting, optional if approving)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        style={{ minHeight: 80, marginBottom: 12 }}
      />

      {error && (
        <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          className="btn-success"
          onClick={() => handleAction("approve")}
          disabled={loading}
          style={{ flex: 1 }}
        >
          ✓ Approve
        </button>
        <button
          className="btn-danger"
          onClick={() => handleAction("reject")}
          disabled={loading}
          style={{ flex: 1 }}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}

// The workflow progress stepper
function WorkflowStepper({ status }) {
  const steps = [
    { key: "draft", label: "Draft" },
    { key: "in_review", label: "Editor Review" },
    { key: "in_approval", label: "Final Approval" },
    { key: "published", label: "Published" },
  ];

  const ORDER = { draft: 0, in_review: 1, in_approval: 2, published: 3 };
  const current = ORDER[status] ?? 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "16px 20px",
      }}
    >
      {steps.map((step, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <div
            key={step.key}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < steps.length - 1 ? 1 : 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: done
                    ? "var(--success)"
                    : active
                      ? "var(--accent)"
                      : "var(--border)",
                  color: done || active ? "#fff" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: active
                    ? "var(--accent)"
                    : done
                      ? "var(--success)"
                      : "var(--text-muted)",
                  fontWeight: active || done ? 500 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: done ? "var(--success)" : "var(--border)",
                  margin: "0 6px",
                  marginBottom: 18,
                  transition: "background 0.2s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ContentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useUser();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getContentById(id);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Content not found.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
    fetchData();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitContent(id);
      showToast(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this draft? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteContent(id);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading)
    return (
      <div className="page" style={{ color: "var(--text-muted)" }}>
        Loading…
      </div>
    );
  if (error && !data)
    return (
      <div className="page">
        <div style={{ color: "var(--danger)", marginBottom: 12 }}>{error}</div>
        <button className="btn-ghost" onClick={() => navigate("/")}>
          ← Back
        </button>
      </div>
    );

  const { content, history } = data;
  const isOwner = content.createdBy?._id === currentUser?._id;
  const canEdit = isOwner && content.status === "draft" && !content.isLocked;
  const canSubmit = isOwner && content.status === "draft" && !content.isLocked;
  const canDelete = isOwner && content.status === "draft";

  // Which action panel should this user see?
  const showEditorPanel =
    currentUser?.role === "editor" && content.status === "in_review";
  const showApproverPanel =
    currentUser?.role === "approver" && content.status === "in_approval";

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 999,
            background: "#1a202c",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: "var(--radius)",
            fontSize: 13,
            boxShadow: "var(--shadow-md)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <div
        style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}
      >
        <span
          style={{ cursor: "pointer", color: "var(--accent)" }}
          onClick={() => navigate("/")}
        >
          Dashboard
        </span>
        {" / "}
        {content.title}
      </div>

      {/* Title row */}
      <div
        className="flex-between"
        style={{ marginBottom: 16, alignItems: "flex-start", gap: 16 }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h1 style={{ fontSize: 22, fontWeight: 600 }}>{content.title}</h1>
            {content.version > 1 && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  background: "#f1f5f9",
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                v{content.version}
              </span>
            )}
            <StatusBadge status={content.status} />
          </div>
          <div
            style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}
          >
            by {content.createdBy?.name} · {formatDate(content.updatedAt)}
            {content.tags?.length > 0 && (
              <span>
                {" "}
                ·{" "}
                {content.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      background: "#f1f5f9",
                      padding: "1px 8px",
                      borderRadius: 10,
                      marginLeft: 4,
                      fontSize: 12,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {canEdit && (
              <button
                className="btn-ghost"
                style={{ fontSize: 13 }}
                onClick={() => navigate(`/edit/${id}`)}
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                className="btn-ghost"
                style={{ fontSize: 13, color: "var(--danger)" }}
                onClick={handleDelete}
                disabled={deleting}
              >
                Delete
              </button>
            )}
            {canSubmit && (
              <button
                className="btn-primary"
                style={{ fontSize: 13 }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit for Review →"}
              </button>
            )}
          </div>
        )}
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

      {/* Workflow stepper */}
      <div className="card" style={{ marginBottom: 20 }}>
        <WorkflowStepper status={content.status} />
      </div>

      {/* Rejection banner for creator */}
      {content.status === "draft" &&
        content.lastRejectionComment &&
        isOwner && (
          <div
            style={{
              background: "var(--danger-bg)",
              border: "1px solid #feb2b2",
              borderRadius: "var(--radius)",
              padding: "12px 16px",
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: "var(--danger)",
                marginBottom: 4,
              }}
            >
              Rejected by {content.lastRejectedBy?.name || "reviewer"}
            </div>
            <div style={{ color: "#742a2a" }}>
              {content.lastRejectionComment}
            </div>
            <div
              style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 12 }}
            >
              Edit your content and re-submit — it will restart from Stage 1.
            </div>
          </div>
        )}

      {/* Published banner */}
      {content.status === "published" && (
        <div
          style={{
            background: "var(--success-bg)",
            border: "1px solid #9ae6b4",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 13,
            color: "#276749",
          }}
        >
          ✓ Published on {formatDate(content.publishedAt)} — this content is
          locked and cannot be edited.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Main content */}
        <div>
          {/* Reviewer action panel */}
          {(showEditorPanel || showApproverPanel) && (
            <div style={{ marginBottom: 16 }}>
              <ActionPanel
                contentId={id}
                stage={showEditorPanel ? "stage1" : "stage2"}
                onDone={showToast}
              />
            </div>
          )}

          {/* Body */}
          <div className="card" style={{ padding: 24 }}>
            <div
              style={{
                color: "var(--text-primary)",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                fontSize: 15,
              }}
            >
              {content.body}
            </div>
          </div>

          {/* Sub-content section */}
          <SubContentSection
            parentId={id}
            parentStatus={content.status}
            isOwner={isOwner}
            onToast={showToast}
          />
        </div>

        {/* Sidebar: review history */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
            Review History
          </div>
          {history.length === 0 ? (
            <div
              className="card"
              style={{ padding: 16, color: "var(--text-muted)", fontSize: 13 }}
            >
              No review actions yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((action) => (
                <div
                  key={action._id}
                  className="card"
                  style={{
                    padding: "12px 14px",
                    borderLeft: `3px solid ${action.action === "approve" ? "var(--success)" : "var(--danger)"}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Avatar name={action.reviewer?.name} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>
                        {action.reviewer?.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {action.stage === "stage1" ? "Editor" : "Approver"} · v
                        {action.version}
                      </div>
                    </div>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        fontWeight: 600,
                        color:
                          action.action === "approve"
                            ? "var(--success)"
                            : "var(--danger)",
                        background:
                          action.action === "approve"
                            ? "var(--success-bg)"
                            : "var(--danger-bg)",
                        padding: "2px 8px",
                        borderRadius: 10,
                      }}
                    >
                      {action.action === "approve"
                        ? "✓ Approved"
                        : "✕ Rejected"}
                    </span>
                  </div>
                  {action.comment && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 4,
                        paddingLeft: 36,
                      }}
                    >
                      "{action.comment}"
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 4,
                      paddingLeft: 36,
                    }}
                  >
                    {formatDate(action.actedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
