import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificar se as credenciais estão configuradas
const isConfigured = supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'your-supabase-url-here' &&
  supabaseAnonKey !== 'your-supabase-anon-key-here';

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = isConfigured;

// Funções auxiliares para fallback com localStorage quando Supabase não está configurado
const STORAGE_KEYS = {
  distributors: 'pharmacompare_distributors',
  products: 'pharmacompare_products',
  prices: 'pharmacompare_prices',
};

// Helpers para localStorage
const getLocalData = (key) => {
  const data = localStorage.getItem(STORAGE_KEYS[key]);
  return data ? JSON.parse(data) : [];
};

const setLocalData = (key, data) => {
  localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
};

// DISTRIBUIDORAS
export const getDistributors = async () => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('distributors')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  }
  return getLocalData('distributors');
};

export const createDistributor = async (distributor) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('distributors')
      .insert([distributor])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const distributors = getLocalData('distributors');
  const newDistributor = {
    ...distributor,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  distributors.push(newDistributor);
  setLocalData('distributors', distributors);
  return newDistributor;
};

export const updateDistributor = async (id, updates) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('distributors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const distributors = getLocalData('distributors');
  const index = distributors.findIndex(d => d.id === id);
  if (index !== -1) {
    distributors[index] = { ...distributors[index], ...updates };
    setLocalData('distributors', distributors);
    return distributors[index];
  }
  throw new Error('Distribuidora não encontrada');
};

export const deleteDistributor = async (id) => {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('distributors')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
  const distributors = getLocalData('distributors').filter(d => d.id !== id);
  setLocalData('distributors', distributors);
  return true;
};

// PRODUTOS
export const getProducts = async () => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  }
  return getLocalData('products');
};

export const createProduct = async (product) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const products = getLocalData('products');
  const newProduct = {
    ...product,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  products.push(newProduct);
  setLocalData('products', products);
  return newProduct;
};

export const updateProduct = async (id, updates) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const products = getLocalData('products');
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index] = { ...products[index], ...updates };
    setLocalData('products', products);
    return products[index];
  }
  throw new Error('Produto não encontrado');
};

export const deleteProduct = async (id) => {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
  const products = getLocalData('products').filter(p => p.id !== id);
  setLocalData('products', products);
  return true;
};

// PREÇOS
export const getPrices = async () => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('prices')
      .select(`
        *,
        products:product_id(*),
        distributors:distributor_id(*)
      `)
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    return data;
  }
  const prices = getLocalData('prices');
  const products = getLocalData('products');
  const distributors = getLocalData('distributors');

  return prices.map(price => ({
    ...price,
    products: products.find(p => p.id === price.product_id),
    distributors: distributors.find(d => d.id === price.distributor_id),
  }));
};

export const getPricesByProduct = async (productId) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('prices')
      .select(`
        *,
        distributors:distributor_id(*)
      `)
      .eq('product_id', productId)
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    return data;
  }
  const prices = getLocalData('prices').filter(p => p.product_id === productId);
  const distributors = getLocalData('distributors');

  return prices.map(price => ({
    ...price,
    distributors: distributors.find(d => d.id === price.distributor_id),
  }));
};

export const createPrice = async (price) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('prices')
      .insert([price])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const prices = getLocalData('prices');
  const newPrice = {
    ...price,
    id: crypto.randomUUID(),
    recorded_at: new Date().toISOString(),
  };
  prices.push(newPrice);
  setLocalData('prices', prices);
  return newPrice;
};

export const updatePrice = async (id, updates) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('prices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const prices = getLocalData('prices');
  const index = prices.findIndex(p => p.id === id);
  if (index !== -1) {
    prices[index] = { ...prices[index], ...updates };
    setLocalData('prices', prices);
    return prices[index];
  }
  throw new Error('Preço não encontrado');
};

export const deletePrice = async (id) => {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('prices')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
  const prices = getLocalData('prices').filter(p => p.id !== id);
  setLocalData('prices', prices);
  return true;
};

// Buscar histórico de preços para gráficos
export const getPriceHistory = async (productId, distributorId = null) => {
  if (isSupabaseConfigured) {
    let query = supabase
      .from('prices')
      .select('*')
      .eq('product_id', productId)
      .order('recorded_at', { ascending: true });

    if (distributorId) {
      query = query.eq('distributor_id', distributorId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  let prices = getLocalData('prices').filter(p => p.product_id === productId);
  if (distributorId) {
    prices = prices.filter(p => p.distributor_id === distributorId);
  }
  return prices.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
};
// Função para limpar todo o banco de dados
export const clearAllData = async () => {
  if (isSupabaseConfigured) {
    // Excluir preços primeiro (embora o CASCADE deva tratar isso, é mais seguro)
    const { error: errPrices } = await supabase.from('prices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (errPrices) throw errPrices;

    // Excluir produtos
    const { error: errProducts } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (errProducts) throw errProducts;

    // Excluir distribuidoras
    const { error: errDistributors } = await supabase.from('distributors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (errDistributors) throw errDistributors;

    return true;
  }

  // Limpar LocalStorage
  localStorage.removeItem(STORAGE_KEYS.prices);
  localStorage.removeItem(STORAGE_KEYS.products);
  localStorage.removeItem(STORAGE_KEYS.distributors);
  return true;
};
