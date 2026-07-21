import client from './client';

export const getLaborLogs = (projectId) =>
  client.get(`/projects/${projectId}/labor`).then((r) => r.data.laborLogs);

export const createLaborLog = (projectId, payload) =>
  client.post(`/projects/${projectId}/labor`, payload).then((r) => r.data.laborLog);
