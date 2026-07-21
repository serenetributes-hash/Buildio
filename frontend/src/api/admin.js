import client from './client';

export const seedSampleData = () => client.post('/admin/seed-sample-data').then((r) => r.data);
