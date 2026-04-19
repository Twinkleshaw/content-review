import { useEffect, useState } from "react";
import StatusBadge from "./StatusBadge";
import { useUser } from "../context/UserContext";
import {
  approveSubContent,
  createSubContent,
  deleteSubContent,
  getSubContentById,
  getSubContents,
  reviewSubContent,
  submitSubContent,
  updateSubContent,
} from "../services/subcontent.service";

const TYPE_LABELS = {
  section: "Section",
  attachment: "Attachment",
  note: "Note",
  reference: "Reference",
};

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Inline action panel for a single sub-content item
function SubActionPanel({ parentId, itemId, stage, onDone }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAction = async (action) => {
    if (action === "reject" && !comment.trim()) {
      return setError("Please provide a reason for rejection.");
    }
    setLoading(true);
    setError("");
    try {
      let res;

      if (stage === "stage1") {
        res = await reviewSubContent(parentId, itemId, { action, comment });
      } else {
        res = await approveSubContent(parentId, itemId, { action, comment });
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
      style={{
        background: "#f8faff",
        border: "1px solid #c7d7f4",
        borderRadius: 8,
        padding: "12px 14px",
        marginTop: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#3730a3",
          marginBottom: 8,
        }}
      >
        Your review required
      </div>
      <textarea
        placeholder="Comment (required if rejecting)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        style={{ minHeight: 60, fontSize: 13, marginBottom: 8 }}
      />
      {error && (
        <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 8 }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn-success"
          style={{ flex: 1, padding: "6px 12px", fontSize: 12 }}
          disabled={loading}
          onClick={() => handleAction("approve")}
        >
          ✓ Approve
        </button>
        <button
          className="btn-danger"
          style={{ flex: 1, padding: "6px 12px", fontSize: 12 }}
          disabled={loading}
          onClick={() => handleAction("reject")}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}

// Inline add/edit form
function SubContentForm({ parentId, existing, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: existing?.title || "",
    body: existing?.body || "",
    type: existing?.type || "section",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError("Title is required.");
    if (!form.body.trim()) return setError("Body is required.");
    setLoading(true);
    setError("");
    try {
      if (existing) {
        await updateSubContent(parentId, existing._id, form);
      } else {
        await createSubContent(parentId, form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || "Save failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "var(--bg)",
        border: "1px dashed var(--border)",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <input
            placeholder="Sub-content title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={{ fontSize: 13 }}
          />
        </div>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          style={{ width: 130, fontSize: 13 }}
        >
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <textarea
        placeholder="Write sub-content body…"
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
        style={{ minHeight: 90, fontSize: 13, marginBottom: 10 }}
      />
      {error && (
        <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 8 }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          className="btn-ghost"
          style={{ fontSize: 12, padding: "5px 12px" }}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn-primary"
          style={{ fontSize: 12, padding: "5px 12px" }}
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? "Saving…" : existing ? "Save Changes" : "Add Sub-content"}
        </button>
      </div>
    </div>
  );
}

// Single sub-content card
function SubContentCard({ item, parentId, isOwner, onRefresh, onToast }) {
  const { currentUser } = useUser();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const loadHistory = async () => {
    if (historyLoaded) return;
    try {
      const res = await getSubContentById(parentId, item._id);
      setHistory(res.data.history);
      setHistoryLoaded(true);
    } catch {}
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadHistory();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitSubContent(parentId, item._id);
      onToast(res.data.message);
      onRefresh();
    } catch (err) {
      onToast(err.response?.data?.error || "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this sub-content?")) return;
    try {
      await deleteSubContent(parentId, item._id);
      onToast("Sub-content deleted.");
      onRefresh();
    } catch (err) {
      onToast(err.response?.data?.error || "Delete failed.");
    }
  };

  const showEditorPanel =
    currentUser?.role === "editor" && item.status === "in_review";
  const showApproverPanel =
    currentUser?.role === "approver" && item.status === "in_approval";
  const canEdit = isOwner && item.status === "draft" && !item.isLocked;
  const canSubmit = isOwner && item.status === "draft" && !item.isLocked;
  const canDelete = isOwner && item.status === "draft";

  if (editing) {
    return (
      <SubContentForm
        parentId={parentId}
        existing={item}
        onSave={() => {
          setEditing(false);
          onRefresh();
          onToast("Sub-content updated.");
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={handleExpand}
      >
        <span
          style={{
            fontSize: 11,
            background: "#f1f5f9",
            color: "var(--text-muted)",
            padding: "1px 7px",
            borderRadius: 10,
            flexShrink: 0,
          }}
        >
          {TYPE_LABELS[item.type]}
        </span>
        <span
          style={{
            fontWeight: 500,
            fontSize: 14,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title}
        </span>
        {item.version > 1 && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            v{item.version}
          </span>
        )}
        <StatusBadge status={item.status} />
        <svg
          style={{
            flexShrink: 0,
            transition: "transform 0.15s",
            transform: expanded ? "rotate(180deg)" : "rotate(0)",
          }}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M3 5l4 4 4-4"
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div
          style={{
            padding: "0 14px 14px",
            borderTop: "1px solid var(--border)",
          }}
        >
          {/* Rejection banner */}
          {item.status === "draft" && item.lastRejectionComment && isOwner && (
            <div
              style={{
                background: "var(--danger-bg)",
                border: "1px solid #feb2b2",
                borderRadius: 6,
                padding: "8px 12px",
                marginTop: 12,
                fontSize: 12,
                color: "#742a2a",
              }}
            >
              <strong>Rejected:</strong> {item.lastRejectionComment}
              <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
                Edit and re-submit to restart review.
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 12,
              fontSize: 14,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              color: "var(--text-primary)",
            }}
          >
            {item.body}
          </div>

          {/* Owner actions */}
          {(canEdit || canSubmit || canDelete) && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {canEdit && (
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: "5px 12px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  className="btn-ghost"
                  style={{
                    fontSize: 12,
                    padding: "5px 12px",
                    color: "var(--danger)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                >
                  Delete
                </button>
              )}
              {canSubmit && (
                <button
                  className="btn-primary"
                  style={{ fontSize: 12, padding: "5px 12px" }}
                  disabled={submitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmit();
                  }}
                >
                  {submitting ? "Submitting…" : "Submit for Review →"}
                </button>
              )}
            </div>
          )}

          {/* Reviewer action panel */}
          {(showEditorPanel || showApproverPanel) && (
            <SubActionPanel
              parentId={parentId}
              itemId={item._id}
              stage={showEditorPanel ? "stage1" : "stage2"}
              onDone={(msg) => {
                onToast(msg);
                onRefresh();
                setHistoryLoaded(false);
                loadHistory();
              }}
            />
          )}

          {/* Review history */}
          {history.length > 0 && (
            <div
              style={{
                marginTop: 12,
                borderTop: "1px solid var(--border)",
                paddingTop: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                }}
              >
                Review history
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {history.map((h) => (
                  <div
                    key={h._id}
                    style={{
                      fontSize: 12,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "6px 10px",
                      background: "var(--bg)",
                      borderRadius: 6,
                      borderLeft: `3px solid ${h.action === "approve" ? "var(--success)" : "var(--danger)"}`,
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{h.reviewer?.name}</span>
                    <span
                      style={{
                        color:
                          h.action === "approve"
                            ? "var(--success)"
                            : "var(--danger)",
                        fontWeight: 600,
                      }}
                    >
                      {h.action === "approve" ? "✓ Approved" : "✕ Rejected"}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      v{h.version}
                    </span>
                    {h.comment && (
                      <span style={{ color: "var(--text-secondary)" }}>
                        — "{h.comment}"
                      </span>
                    )}
                    <span
                      style={{
                        marginLeft: "auto",
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {formatDate(h.actedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main export: the sub-content section rendered inside ContentDetail
export default function SubContentSection({
  parentId,
  parentStatus,
  isOwner,
  onToast,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await getSubContents(parentId);
      setItems(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [parentId]);

  const unpublished = items.filter((i) => i.status !== "published");
  const parentIsLocked = parentStatus === "published";

  return (
    <div style={{ marginTop: 28 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Sub-content</span>
          <span
            style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}
          >
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        {isOwner && !parentIsLocked && !showForm && (
          <button
            className="btn-ghost"
            style={{ fontSize: 12, padding: "5px 12px" }}
            onClick={() => setShowForm(true)}
          >
            + Add
          </button>
        )}
      </div>

      {/* Blocker warning — shows when parent is in draft and there are unfinished sub-items */}
      {isOwner && parentStatus === "draft" && unpublished.length > 0 && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 13,
            color: "#92400e",
          }}
        >
          ⚠ {unpublished.length} sub-content item
          {unpublished.length > 1 ? "s" : ""} must be published before you can
          submit the parent for review.
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {showForm && (
            <SubContentForm
              parentId={parentId}
              onSave={() => {
                setShowForm(false);
                fetchItems();
                onToast("Sub-content added.");
              }}
              onCancel={() => setShowForm(false)}
            />
          )}
          {items.length === 0 && !showForm && (
            <div
              style={{
                border: "1px dashed var(--border)",
                borderRadius: 8,
                padding: "24px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              No sub-content yet.
              {isOwner && !parentIsLocked && (
                <span>
                  {" "}
                  <span
                    style={{ color: "var(--accent)", cursor: "pointer" }}
                    onClick={() => setShowForm(true)}
                  >
                    Add some →
                  </span>
                </span>
              )}
            </div>
          )}
          {items.map((item) => (
            <SubContentCard
              key={item._id}
              item={item}
              parentId={parentId}
              isOwner={isOwner}
              onRefresh={fetchItems}
              onToast={onToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}
