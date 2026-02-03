// Script para testar importação de preços
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPriceInsertion() {
    console.log('=== Testando Inserção de Preços ===\n');

    // 1. Buscar distribuidora
    const { data: distributor } = await supabase
        .from('distributors')
        .select('*')
        .single();

    console.log('Distribuidora:', distributor.name, 'ID:', distributor.id);

    // 2. Buscar um produto
    const { data: product } = await supabase
        .from('products')
        .select('*')
        .limit(1)
        .single();

    console.log('Produto:', product.name, 'ID:', product.id);

    // 3. Tentar inserir um preço de teste
    console.log('\nTentando inserir preço de teste...');

    const priceData = {
        product_id: product.id,
        distributor_id: distributor.id,
        price: 25.50,
        min_quantity: 1,
        validity: null
    };

    console.log('Dados:', priceData);

    const { data: insertedPrice, error: insertError } = await supabase
        .from('prices')
        .insert([priceData])
        .select()
        .single();

    if (insertError) {
        console.error('❌ ERRO ao inserir:', insertError);
    } else {
        console.log('✅ Preço inserido com sucesso!');
        console.log('Dados inseridos:', insertedPrice);
    }

    // 4. Verificar se foi salvo
    console.log('\nVerificando preços no banco...');
    const { data: prices, count } = await supabase
        .from('prices')
        .select('*', { count: 'exact' });

    console.log('Total de preços agora:', count);
    if (prices && prices.length > 0) {
        console.log('Último preço:', prices[0]);
    }
}

testPriceInsertion();
