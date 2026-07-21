import client from './client';

export const getUsers = () => client.get('/users').then((r) => r.data.users);
export const createUser = (payload) => client.post('/users', payload).then((r) => r.data.user);
