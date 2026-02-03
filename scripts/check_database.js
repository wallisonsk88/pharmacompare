// Script para verificar o banco de dados do Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Erro: Credenciais do Supabase não configuradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
    console.log('=== Verificando Banco de Dados ===\n');

    // 1. Verificar distribuidoras
    console.log('1. DISTRIBUIDORAS:');
    const { data: distributors, error: distError } = await supabase
        .from('distributors')
        .select('*');

    if (distError) {
        console.error('   Erro:', distError.message);
    } else {
        console.log(`   Total: ${distributors.length}`);
        distributors.forEach(d => console.log(`   - ${d.name} (ID: ${d.id})`));
    }

    // 2. Verificar produtos
    console.log('\n2. PRODUTOS:');
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*');

    if (prodError) {
        console.error('   Erro:', prodError.message);
    } else {
        console.log(`   Total: ${products.length}`);
        console.log(`   Primeiros 5:`);
        products.slice(0, 5).forEach(p => console.log(`   - ${p.name} (EAN: ${p.ean || 'N/A'})`));
    }

    // 3. Verificar preços
    console.log('\n3. PREÇOS:');
    const { data: prices, error: priceError } = await supabase
        .from('prices')
        .select(`
            *,
            products:product_id(name),
            distributors:distributor_id(name)
        `)
        .order('recorded_at', { ascending: false })
        .limit(10);

    if (priceError) {
        console.error('   Erro:', priceError.message);
    } else {
        console.log(`   Total registros recentes: ${prices.length}`);
        if (prices.length > 0) {
            console.log('   Últimos 10 preços:');
            prices.forEach(p => {
                console.log(`   - ${p.products?.name || 'Produto?'} @ ${p.distributors?.name || 'Dist?'}: R$ ${p.price}`);
            });
        } else {
            console.log('   ⚠️ NENHUM PREÇO ENCONTRADO NO BANCO!');
        }
    }

    // 4. Contagem total de preços
    console.log('\n4. CONTAGEM TOTAL DE PREÇOS:');
    const { count, error: countError } = await supabase
        .from('prices')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('   Erro:', countError.message);
    } else {
        console.log(`   Total de preços no banco: ${count}`);
    }

    console.log('\n=== Fim da Verificação ===');
}

checkDatabase();
