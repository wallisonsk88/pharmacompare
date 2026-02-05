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
    // Buscar todos os produtos em lotes para contornar o limite de 1000 do Supabase
    let allProducts = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')
        .range(from, from + batchSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allProducts = allProducts.concat(data);
      if (data.length < batchSize) break; // Último lote
      from += batchSize;
    }

    return allProducts;
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

// Batch insert para produtos (mais rápido)
export const createProductsBatch = async (productList) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('products')
      .insert(productList)
      .select();
    if (error) throw error;
    return data || [];
  }
  const products = getLocalData('products');
  const newProducts = productList.map(product => ({
    ...product,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }));
  products.push(...newProducts);
  setLocalData('products', products);
  return newProducts;
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
      .order('recorded_at', { ascending: false })
      .range(0, 50000); // Supabase limita a 1000 por padrão
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

// Batch insert para preços (mais rápido)
export const createPricesBatch = async (priceList) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('prices')
      .insert(priceList)
      .select();
    if (error) throw error;
    return data || [];
  }
  const prices = getLocalData('prices');
  const newPrices = priceList.map(price => ({
    ...price,
    id: crypto.randomUUID(),
    recorded_at: new Date().toISOString(),
  }));
  prices.push(...newPrices);
  setLocalData('prices', prices);
  return newPrices;
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

// ========== LISTA DE COMPRAS ==========

// Buscar toda a lista de compras
export const getShoppingList = async () => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*')
      .order('created_at');
    if (error) throw error;
    return data || [];
  }
  // Fallback para localStorage
  const data = localStorage.getItem('pharmacompare_shopping_list');
  return data ? JSON.parse(data) : [];
};

// Adicionar item à lista
export const addShoppingItem = async (item) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('shopping_list')
      .insert([{
        product_id: item.product_id,
        product_name: item.name,
        product_ean: item.ean,
        price: item.price || 0,
        distributor_id: item.distributor_id,
        distributor_name: item.distributor_name,
        quantity: item.quantity || 1,
        last_price: item.last_price,
        last_distributor: item.last_distributor
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  return item;
};

// Atualizar item da lista
export const updateShoppingItem = async (id, updates) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('shopping_list')
      .update({
        price: updates.price,
        distributor_id: updates.distributor_id,
        distributor_name: updates.distributor_name,
        quantity: updates.quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  return updates;
};

// Remover item da lista
export const deleteShoppingItem = async (id) => {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('shopping_list')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
  return true;
};

// Limpar toda a lista de compras
export const clearShoppingList = async () => {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('shopping_list')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    return true;
  }
  localStorage.removeItem('pharmacompare_shopping_list');
  return true;
};
// ========== BACKUP E RESTAURAÇÃO ==========

export const exportFullDatabase = async () => {
  try {
    const [distributors, products, prices, shoppingList] = await Promise.all([
      getDistributors(),
      getProducts(),
      getPrices(),
      getShoppingList()
    ]);

    return {
      distributors,
      products,
      prices,
      shopping_list: shoppingList,
      exported_at: new Date().toISOString(),
      version: '1.0'
    };
  } catch (error) {
    console.error('Erro ao exportar banco de dados:', error);
    throw error;
  }
};

// Função para importar dados em massa (restauração completa)
export const importFullDatabase = async (data) => {
  try {
    // 1. Limpar dados atuais
    await clearAllData();

    // 2. Importar distribuidoras (primeiro, por causa das chaves estrangeiras)
    if (data.distributors && data.distributors.length > 0) {
      if (isSupabaseConfigured) {
        // No Supabase, se os IDs originais forem fornecidos, ele tentará usá-los. 
        // Isso é bom para manter a integridade referencial do backup.
        const { error } = await supabase.from('distributors').insert(data.distributors);
        if (error) throw error;
      } else {
        localStorage.setItem(STORAGE_KEYS.distributors, JSON.stringify(data.distributors));
      }
    }

    // 3. Importar produtos
    if (data.products && data.products.length > 0) {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('products').insert(data.products);
        if (error) throw error;
      } else {
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(data.products));
      }
    }

    // 4. Importar preços
    if (data.prices && data.prices.length > 0) {
      if (isSupabaseConfigured) {
        // Filtrar campos que vêm do SELECT join (products, distributors) mas não existem na tabela prices
        const rawPrices = data.prices.map(p => {
          const { products, distributors, ...rest } = p;
          return rest;
        });
        const { error } = await supabase.from('prices').insert(rawPrices);
        if (error) throw error;
      } else {
        localStorage.setItem(STORAGE_KEYS.prices, JSON.stringify(data.prices));
      }
    }

    // 5. Importar lista de compras
    if (data.shopping_list && data.shopping_list.length > 0) {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('shopping_list').insert(data.shopping_list);
        if (error) throw error;
      } else {
        localStorage.setItem('pharmacompare_shopping_list', JSON.stringify(data.shopping_list));
      }
    }

    return true;
  } catch (error) {
    console.error('Erro ao importar banco de dados:', error);
    throw error;
  }
};
