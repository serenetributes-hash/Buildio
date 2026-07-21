import client from './client';

export const getPL = (startDate, endDate) =>
  client.get('/finance/pl', { params: { startDate, endDate } }).then((r) => r.data);

export const addOverhead = (payload) =>
  client.post('/finance/overheads', payload).then((r) => r.data);
