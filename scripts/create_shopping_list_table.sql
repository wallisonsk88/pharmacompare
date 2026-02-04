-- Executar este SQL no Supabase SQL Editor
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

-- Habilitar RLS (Row Level Security)
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (sistema sem autenticação)
CREATE POLICY "Allow all operations on shopping_list" ON shopping_list
    FOR ALL USING (true) WITH CHECK (true);

-- Índice para busca por produto
CREATE INDEX IF NOT EXISTS idx_shopping_list_product_id ON shopping_list(product_id);
