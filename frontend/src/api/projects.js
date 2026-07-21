import client from './client';

export const getProjects = () => client.get('/projects').then((r) => r.data.projects);

export const getProjectMetrics = (projectId) =>
  client.get(`/projects/${projectId}/metrics`).then((r) => r.data);

export const createProject = (payload) =>
  client.post('/projects', payload).then((r) => r.data.project);
