import client from './client';

export const getInvoices = (projectId) =>
  client.get(`/projects/${projectId}/invoices`).then((r) => r.data.invoices);

export const createInvoice = (projectId, payload) =>
  client.post(`/projects/${projectId}/invoices`, payload).then((r) => r.data.invoice);
