import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CSV_PATH = 'C:/Users/Wallison Meganet/Desktop/Produtos/PRODUTOS SISTEMA BASE.csv';

async function run() {
    console.log('--- Iniciando Importação (Toureiro) ---');

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`Erro: Arquivo não encontrado: ${CSV_PATH}`);
        return;
    }

    // 1. Garantir que a distribuidora "Toureiro" exista
    let { data: distributor, error: distError } = await supabase
        .from('distributors')
        .select('id')
        .eq('name', 'Toureiro')
        .single();

    if (distError && distError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Erro ao buscar distribuidora:', distError);
        return;
    }

    if (!distributor) {
        console.log('Distribuidora Toureiro não encontrada. Criando...');
        const { data: newDist, error: createDistError } = await supabase
            .from('distributors')
            .insert([{ name: 'Toureiro' }])
            .select()
            .single();

        if (createDistError) {
            console.error('Erro ao criar distribuidora:', createDistError);
            return;
        }
        distributor = newDist;
        console.log(`Distribuidora Toureiro criada com ID: ${distributor.id}`);
    } else {
        console.log(`Distribuidora Toureiro encontrada (ID: ${distributor.id})`);
    }

    // 2. Ler e processar o CSV
    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const header = lines[0].split(',');

    // Mapeamento rudimentar de colunas baseado no que vimos (Nome,Cdigo,Preo,EAN / GTIN)
    // Mas o encoding parece estar quebrado, vamos tentar identificar por posição
    // 0: Nome, 1: Código, 2: Preço, 3: EAN

    let successCount = 0;
    let errorCount = 0;

    console.log(`Processando ${lines.length - 1} linhas...`);

    for (let i = 1; i < lines.length; i++) {
        // Parser manual simples para lidar com possíveis vírgulas dentro de aspas
        const line = lines[i];
        const parts = [];
        let current = '';
        let inQuotes = false;

        for (let char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim());

        if (parts.length < 3) continue;

        const name = parts[0];
        const ean = parts[3] || parts[1]; // Tenta EAN na col 3, senão usa o Código da col 1
        let priceStr = parts[2] || '';

        // Limpar preço: "R$ 20,00 " -> 20.00
        priceStr = priceStr.replace('R$', '').replace(',', '.').replace(/\s/g, '');
        const priceVal = parseFloat(priceStr);

        if (!name || isNaN(priceVal)) {
            errorCount++;
            continue;
        }

        try {
            // 3. Upsert Produto
            let { data: product, error: prodError } = await supabase
                .from('products')
                .select('id')
                .eq('name', name)
                .single();

            if (prodError && prodError.code !== 'PGRST116') throw prodError;

            if (!product) {
                const { data: newProd, error: createProdError } = await supabase
                    .from('products')
                    .insert([{
                        name: name,
                        ean: ean,
                        category: 'generico',
                        unit: 'cx'
                    }])
                    .select()
                    .single();

                if (createProdError) throw createProdError;
                product = newProd;
            }

            // 4. Inserir Preço
            const { error: priceError } = await supabase
                .from('prices')
                .insert([{
                    product_id: product.id,
                    distributor_id: distributor.id,
                    price: priceVal,
                    recorded_at: new Date().toISOString()
                }]);

            if (priceError) throw priceError;

            successCount++;
            if (successCount % 50 === 0) console.log(`${successCount} produtos processados...`);

        } catch (err) {
            console.error(`Erro na linha ${i} (${name}):`, err.message);
            errorCount++;
        }
    }

    console.log('--- Importação Finalizada ---');
    console.log(`Sucesso: ${successCount}`);
    console.log(`Erros/Ignorados: ${errorCount}`);
}

run();
