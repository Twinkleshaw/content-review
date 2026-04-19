import api from "../api";

// GET all sub-content
export const getSubContents = (parentId) => {
  return api.get(`/contents/${parentId}/subcontent`);
};

// GET single (for history)
export const getSubContentById = (parentId, itemId) => {
  return api.get(`/contents/${parentId}/subcontent/${itemId}`);
};

// CREATE
export const createSubContent = (parentId, payload) => {
  return api.post(`/contents/${parentId}/subcontent`, payload);
};

// UPDATE
export const updateSubContent = (parentId, itemId, payload) => {
  return api.put(`/contents/${parentId}/subcontent/${itemId}`, payload);
};

// DELETE
export const deleteSubContent = (parentId, itemId) => {
  return api.delete(`/contents/${parentId}/subcontent/${itemId}`);
};

// WORKFLOW
export const submitSubContent = (parentId, itemId) => {
  return api.post(`/contents/${parentId}/subcontent/${itemId}/submit`);
};

export const reviewSubContent = (parentId, itemId, payload) => {
  return api.post(`/contents/${parentId}/subcontent/${itemId}/review`, payload);
};

export const approveSubContent = (parentId, itemId, payload) => {
  return api.post(
    `/contents/${parentId}/subcontent/${itemId}/approve`,
    payload,
  );
};

export const getSubContentsByParent = (parentId) => {
  return api.get(`/contents/${parentId}/subcontent`);
};
