const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
// Fallback logic for hardcoded localhost if env var is missing during Vite build
const BASE_URL = VITE_BACKEND_URL.endsWith('/api') ? VITE_BACKEND_URL : `${VITE_BACKEND_URL}/api`;

const getHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || response.statusText || 'API Request Failed');
    }

    if (response.status === 204) return null;
    return response.json();
};

const authListeners = new Set<(event: string, session: any) => void>();

export const notifyAuthStateChange = (event: string, session: any) => {
    authListeners.forEach(listener => {
        try {
            listener(event, session);
        } catch (err) {
            console.error('Error in auth listener:', err);
        }
    });
};

export const api = {
    get: async <T = any>(endpoint: string): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    post: async <T = any>(endpoint: string, data: any): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    put: async <T = any>(endpoint: string, data: any): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    patch: async <T = any>(endpoint: string, data: any): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    delete: async <T = any>(endpoint: string): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    // Supabase-like helper for generic data access
    from: (table: string) => {
        const queryParams: any = {};
        let method = 'GET';
        let body: any = null;
        
        const builder: any = {
            select: (columns: string = '*') => {
                queryParams.select = columns;
                return builder;
            },
            eq: (column: string, value: any) => {
                queryParams[column] = `eq.${value}`;
                return builder;
            },
            neq: (column: string, value: any) => {
                queryParams[column] = `neq.${value}`;
                return builder;
            },
            gt: (column: string, value: any) => {
                queryParams[column] = `gt.${value}`;
                return builder;
            },
            gte: (column: string, value: any) => {
                queryParams[column] = `gte.${value}`;
                return builder;
            },
            lt: (column: string, value: any) => {
                queryParams[column] = `lt.${value}`;
                return builder;
            },
            lte: (column: string, value: any) => {
                queryParams[column] = `lte.${value}`;
                return builder;
            },
            like: (column: string, pattern: string) => {
                queryParams[column] = `like.${pattern}`;
                return builder;
            },
            ilike: (column: string, pattern: string) => {
                queryParams[column] = `ilike.${pattern}`;
                return builder;
            },
            is: (column: string, value: any) => {
                queryParams[column] = `is.${value === null ? 'null' : value}`;
                return builder;
            },
            not: (column: string, operator: string, value: any) => {
                queryParams[column] = `neq.${value}`;
                return builder;
            },
            order: (column: string, { ascending = true } = {}) => {
                queryParams.order = `${column}.${ascending ? 'asc' : 'desc'}`;
                return builder;
            },
            limit: (count: number) => {
                queryParams.limit = count;
                return builder;
            },
            range: (from: number, to: number) => {
                queryParams.offset = from;
                queryParams.limit = to - from + 1;
                return builder;
            },
            single: () => {
                queryParams.single = 'true';
                return builder;
            },
            maybeSingle: () => {
                queryParams.single = 'true';
                return builder;
            },
            in: (column: string, values: any[]) => {
                queryParams[column] = `in.(${values.join(',')})`;
                return builder;
            },
            insert: (data: any) => {
                method = 'POST';
                body = data;
                return builder;
            },
            upsert: (data: any) => {
                method = 'POST';
                body = data;
                return builder;
            },
            update: (updates: any) => {
                method = 'PUT';
                body = updates;
                return builder;
            },
            delete: () => {
                method = 'DELETE';
                return builder;
            },
            // The executor
            then: async (onfulfilled?: (value: any) => any) => {
                try {
                    let resultData: any;
                    const query = new URLSearchParams(queryParams).toString();
                    const url = `/data/${table}${query ? `?${query}` : ''}`;

                    if (method === 'GET') {
                        resultData = await api.get(url);
                    } else if (method === 'POST') {
                        resultData = await api.post(`/data/${table}`, body);
                    } else if (method === 'PUT') {
                        const idFilter = Object.keys(queryParams).find(k => queryParams[k]?.startsWith('eq.'));
                        if (idFilter) {
                            const id = queryParams[idFilter].split('.')[1];
                            resultData = await api.put(`/data/${table}/${id}`, body);
                        } else {
                            resultData = await api.post(`/data/${table}/update`, { updates: body, filters: queryParams });
                        }
                    } else if (method === 'DELETE') {
                        const idFilter = Object.keys(queryParams).find(k => queryParams[k]?.startsWith('eq.'));
                        if (idFilter) {
                            const id = queryParams[idFilter].split('.')[1];
                            resultData = await api.delete(`/data/${table}/${id}`);
                        } else {
                            resultData = await api.post(`/data/${table}/delete`, { filters: queryParams });
                        }
                    }

                    // Handle .single()
                    if (queryParams.single === 'true' && Array.isArray(resultData)) {
                        resultData = resultData[0] || null;
                    }

                    const result = { data: resultData, error: null };
                    return onfulfilled ? onfulfilled(result) : result;
                } catch (error: any) {
                    const result = { data: null, error };
                    return onfulfilled ? onfulfilled(result) : result;
                }
            }
        };
        
        return builder;
    },

    rpc: async (fn: string, params?: any) => {
        try {
            const res = await api.post(`/data/rpc/${fn}`, params || {});
            return { data: res?.data !== undefined ? res.data : res, error: null };
        } catch (error: any) {
            console.error(`RPC error for ${fn}:`, error);
            return { data: null, error };
        }
    },

    auth: {
        getUser: async () => {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) return { data: { user: null }, error: null };
                const res = await api.get('/auth/me');
                const user = res?.content?.user || res?.user || res;
                return { data: { user }, error: null };
            } catch (error) {
                return { data: { user: null }, error };
            }
        },
        getSession: async () => {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) return { data: { session: null }, error: null };
                const res = await api.get('/auth/me');
                const user = res?.content?.user || res?.user || res;
                if (!user) return { data: { session: null }, error: null };
                const session = { user, access_token: token };
                return { data: { session }, error: null };
            } catch (error) {
                return { data: { session: null }, error };
            }
        },
        onAuthStateChange: (callback: (event: string, session: any) => void) => {
            authListeners.add(callback);
            const token = localStorage.getItem('auth_token');
            if (token) {
                api.get('/auth/me')
                    .then(res => {
                        const user = res?.content?.user || res?.user || res;
                        if (user) {
                            callback('SIGNED_IN', { user, access_token: token });
                        } else {
                            localStorage.removeItem('auth_token');
                            callback('SIGNED_OUT', null);
                        }
                    })
                    .catch(() => {
                        localStorage.removeItem('auth_token');
                        callback('SIGNED_OUT', null);
                    });
            } else {
                setTimeout(() => callback('INITIAL_SESSION', null), 0);
            }
            return {
                data: {
                    subscription: {
                        unsubscribe: () => {
                            authListeners.delete(callback);
                        }
                    }
                }
            };
        },
        signInWithPassword: async ({ email, password }: any) => {
            try {
                const res = await api.post('/auth/login', { email, password });
                const token = res?.content?.access_token || res?.access_token || res?.token;
                const user = res?.content?.user || res?.user;
                if (!token) {
                    throw new Error(res?.message || 'Login failed: No access token received');
                }
                localStorage.setItem('auth_token', token);
                const session = { user, access_token: token };
                notifyAuthStateChange('SIGNED_IN', session);
                return { data: { user, session }, error: null };
            } catch (error: any) {
                return { data: { user: null, session: null }, error };
            }
        },
        signUp: async ({ email, password }: any) => {
            try {
                const res = await api.post('/auth/register', { email, password });
                const token = res?.content?.access_token || res?.access_token || res?.token;
                const user = res?.content?.user || res?.user;
                if (token) {
                    localStorage.setItem('auth_token', token);
                    const session = { user, access_token: token };
                    notifyAuthStateChange('SIGNED_IN', session);
                    return { data: { user, session }, error: null };
                }
                return { data: { user, session: null }, error: null };
            } catch (error: any) {
                return { data: { user: null, session: null }, error };
            }
        },
        signOut: async () => {
            localStorage.removeItem('auth_token');
            notifyAuthStateChange('SIGNED_OUT', null);
            try {
                await api.post('/auth/logout', {});
            } catch (e) {}
            return { error: null };
        }
    },

    storage: {
        from: (bucket: string) => ({
            upload: async (path: string, file: File, options?: any) => {
                console.warn(`Mock Storage: Uploading ${file.name} to ${bucket}/${path}`);
                // Could implement actual file upload via FormData here
                return { data: { path }, error: null };
            },
            getPublicUrl: (path: string) => {
                return { data: { publicUrl: `mock-url-for-${path}` } };
            }
        })
    },

    functions: {
        invoke: async (functionName: string, options?: any) => {
            try {
                let endpoint = `/ai/${functionName}`;
                if (functionName === 'ai-dish-ingredients') {
                    endpoint = '/ai/ai-dish-ingredients';
                }
                const res = await api.post(endpoint, options?.body || {});
                return { data: res, error: null };
            } catch (error: any) {
                console.error(`functions.invoke error for ${functionName}:`, error);
                return { data: null, error };
            }
        }
    }
};
