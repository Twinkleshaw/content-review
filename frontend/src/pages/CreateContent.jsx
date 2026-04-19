import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import {
  createContent,
  getContentById,
  updateContent,
} from "../services/content.service";

export default function CreateContent() {
  const { id } = useParams(); // present when editing
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { currentUser } = useUser();

  const [form, setForm] = useState({ title: "", body: "", tags: "" });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing) return;
    getContentById(id)
      .then((res) => {
        const c = res.data.content;
        setForm({
          title: c.title,
          body: c.body,
          tags: c.tags?.join(", ") || "",
        });
      })
      .catch(() => setError("Failed to load content."))
      .finally(() => setFetching(false));
  }, [id]);

  // Redirect non-creators away
  useEffect(() => {
    if (currentUser && currentUser.role !== "creator") {
      navigate("/");
    }
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("Title is required.");
    if (!form.body.trim()) return setError("Body is required.");

    setLoading(true);
    setError("");

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      if (isEditing) {
        await updateContent(id, payload);
        navigate(`/content/${id}`);
      } else {
        const res = await createContent(payload);
        navigate(`/content/${res.data._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="page" style={{ color: "var(--text-muted)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      {/* Breadcrumb */}
      <div
        style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}
      >
        <span
          style={{ cursor: "pointer", color: "var(--accent)" }}
          onClick={() => navigate("/")}
        >
          Dashboard
        </span>
        {" / "}
        {isEditing ? "Edit Content" : "New Content"}
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>
        {isEditing ? "Edit Content" : "Create New Content"}
      </h1>

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

      <form onSubmit={handleSubmit}>
        <div
          className="card"
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Title */}
          <div>
            <label
              style={{
                display: "block",
                fontWeight: 500,
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              Title <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Give your content a clear title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={120}
            />
          </div>

          {/* Body */}
          <div>
            <label
              style={{
                display: "block",
                fontWeight: 500,
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              Body <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <textarea
              placeholder="Write your content here…"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              style={{ minHeight: 200 }}
            />
          </div>

          {/* Tags */}
          <div>
            <label
              style={{
                display: "block",
                fontWeight: 500,
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              Tags
              <span
                style={{
                  fontWeight: 400,
                  color: "var(--text-muted)",
                  marginLeft: 6,
                }}
              >
                (comma-separated)
              </span>
            </label>
            <input
              type="text"
              placeholder="e.g. marketing, product, guide"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? "Saving…"
              : isEditing
                ? "Save Changes"
                : "Create Content"}
          </button>
        </div>
      </form>
    </div>
  );
}
