import client from './client';

export const getWorkers = () => client.get('/workers').then((r) => r.data.workers);
export const createWorker = (payload) => client.post('/workers', payload).then((r) => r.data.worker);
