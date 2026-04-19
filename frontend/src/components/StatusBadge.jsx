const STATUS_LABELS = {
  draft: "Draft",
  in_review: "In Review",
  in_approval: "In Approval",
  published: "Published",
  rejected: "Rejected",
};

const STATUS_DOTS = {
  draft: "#718096",
  in_review: "#3182ce",
  in_approval: "#d69e2e",
  published: "#38a169",
  rejected: "#e53e3e",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      <span style={{
        width: 6, height: 6,
        borderRadius: "50%",
        background: STATUS_DOTS[status] || "#718096",
        display: "inline-block",
        flexShrink: 0,
      }} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
