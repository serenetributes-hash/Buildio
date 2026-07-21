import client from './client';

export const getInventory = () => client.get('/inventory').then((r) => r.data.inventory);

export const stockIn = (payload) =>
  client.post('/inventory/stock-in', payload).then((r) => r.data);

export const stockOut = (payload) =>
  client.post('/inventory/stock-out', payload).then((r) => r.data);
