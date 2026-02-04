-- PharmaCompare - Script de criação das tabelas
-- Execute este script no SQL Editor do Supabase

-- Tabela de Distribuidoras
CREATE TABLE IF NOT EXISTS distributors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  contact TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Produtos (Medicamentos)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ean TEXT,
  manufacturer TEXT,
  category TEXT DEFAULT 'generico',
  unit TEXT DEFAULT 'cx',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Preços
CREATE TABLE IF NOT EXISTS prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  distributor_id UUID REFERENCES distributors(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  min_quantity INTEGER DEFAULT 1,
  validity DATE,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_prices_product ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_distributor ON prices(distributor_id);
CREATE INDEX IF NOT EXISTS idx_prices_recorded ON prices(recorded_at DESC);

-- Habilitar RLS (Row Level Security) - opcional para acesso público
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acesso anônimo (para uso pessoal)
CREATE POLICY "Allow all for distributors" ON distributors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for prices" ON prices FOR ALL USING (true) WITH CHECK (true);

-- Tabela para itens da lista de compras
CREATE TABLE IF NOT EXISTS shopping_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_ean TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    distributor_id UUID REFERENCES distributors(id) ON DELETE SET NULL,
    distributor_name TEXT,
    quantity INTEGER DEFAULT 1,
    last_price DECIMAL(10,2),
    last_distributor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para shopping_list
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações na shopping_list
CREATE POLICY "Allow all for shopping_list" ON shopping_list FOR ALL USING (true) WITH CHECK (true);

-- Índice para busca por produto na lista
CREATE INDEX IF NOT EXISTS idx_shopping_list_product ON shopping_list(product_id);
