import client from './client';

export const getCompliance = (projectId) =>
  client.get(`/projects/${projectId}/compliance`).then((r) => r.data.complianceCosts);

export const createComplianceCost = (projectId, payload) =>
  client.post(`/projects/${projectId}/compliance`, payload).then((r) => r.data.complianceCost);
