const TOKEN_KEY = 'hz_admin_token';

export const session = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

const query = (params = {}) => {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return clean.length ? `?${new URLSearchParams(clean)}` : '';
};

async function send(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`/api/admin${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.get()}` },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Serverga ulanib bo'lmadi. Backend ishlayaptimi?");
  }

  if (response.status === 401 && path !== '/login') {
    session.clear();
    window.location.assign('/login');
  }
  return response;
}

async function request(path, options) {
  const response = await send(path, options);
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) throw new Error(json?.message || `Server xatosi (${response.status})`);
  return json.data;
}

export const api = {
  login: (password) => request('/login', { method: 'POST', body: { password } }),
  me: () => request('/me'),
  dashboard: () => request('/dashboard'),

  orders: (params) => request(`/orders${query(params)}`),
  order: (id) => request(`/orders/${id}`),
  setOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  async downloadOrdersCsv(params) {
    const response = await send(`/orders/export${query(params)}`);
    if (!response.ok) throw new Error('Faylni yuklab bo\'lmadi');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `buyurtmalar-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  products: (params) => request(`/products${query(params)}`),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  adjustStock: (id, data) => request(`/products/${id}/stock`, { method: 'POST', body: data }),
  movements: (params) => request(`/stock/movements${query(params)}`),

  categories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  customers: (params) => request(`/customers${query(params)}`),
};
