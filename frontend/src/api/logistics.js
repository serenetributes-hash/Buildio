import client from './client';

export const getLogistics = (projectId) =>
  client.get(`/projects/${projectId}/logistics`).then((r) => r.data.logisticsCosts);

export const createLogisticsCost = (projectId, payload) =>
  client.post(`/projects/${projectId}/logistics`, payload).then((r) => r.data.logisticsCost);
