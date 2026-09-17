import { getInitData } from './telegram.js';

const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api/client`;

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': getInitData(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Internet aloqasini tekshiring');
  }

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) {
    throw new Error(json?.message || `Server javob bermadi (${response.status})`);
  }
  return json.data;
}

const query = (params = {}) => {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return clean.length ? `?${new URLSearchParams(clean)}` : '';
};

export const api = {
  auth: () => request('/auth', { method: 'POST' }),
  home: () => request('/home'),
  categories: () => request('/categories'),
  products: (params) => request(`/products${query(params)}`),
  upsell: (excludeIds) => request(`/upsell${query({ exclude: excludeIds.join(',') })}`),
  syncCart: (ids) => request('/cart/sync', { method: 'POST', body: { ids } }),
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }),
  myOrders: () => request('/orders'),
  updateProfile: (data) => request('/profile', { method: 'PATCH', body: data }),
};
