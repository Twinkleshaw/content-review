import api from "../api";

export const getContents = (status) => {
  return api.get("/contents", {
    params: status ? { status } : {},
  });
};

// GET single content
export const getContentById = (id) => {
  return api.get(`/contents/${id}`);
};

// CREATE content
export const createContent = (payload) => {
  return api.post("/contents", payload);
};

// UPDATE content
export const updateContent = (id, payload) => {
  return api.put(`/contents/${id}`, payload);
};

export const deleteContent = (id) => {
  return api.delete(`/contents/${id}`);
};

// ===== WORKFLOW =====
export const submitContent = (id) => {
  return api.post(`/workflow/submit/${id}`);
};

export const reviewContent = (id, payload) => {
  return api.post(`/workflow/review/${id}`, payload);
};

export const approveContent = (id, payload) => {
  return api.post(`/workflow/approve/${id}`, payload);
};
