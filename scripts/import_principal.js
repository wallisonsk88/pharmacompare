import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CSV_PATH = 'C:/Users/Wallison/Desktop/melhores_precos.csv';

async function run() {
    console.log('--- Iniciando Importação Principal (MEGAFARMA) ---');
    console.log('Arquivo:', CSV_PATH);

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`Erro: Arquivo não encontrado: ${CSV_PATH}`);
        return;
    }

    // 1. Ler o arquivo usando XLSX para lidar melhor com formatos e encodings
    const data = fs.readFileSync(CSV_PATH);
    const workbook = XLSX.read(data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    console.log(`Total de linhas encontradas: ${rows.length}`);

    let successCount = 0;
    let errorCount = 0;

    // 2. Mapear colunas (identificar nomes mesmo com problemas de encoding)
    // Procuramos por chaves que contenham 'Produto', 'Preço' (ou Preco/PreÃ§o), 'EAN' e 'Distribuidora'

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Identificar campos dinamicamente
        let name = '';
        let priceVal = 0;
        let ean = '';
        let distributorName = 'Planilha Principal';

        for (const key in row) {
            const lowerKey = key.toLowerCase();
            const val = row[key];

            if (lowerKey.includes('produto')) {
                name = String(val).trim();
            } else if (lowerKey.includes('pre') || lowerKey.includes('valor')) {
                if (typeof val === 'number') {
                    priceVal = val;
                } else {
                    let priceStr = String(val || '')
                        .replace('R$', '')
                        .replace(/\s/g, '');
                    if (priceStr.includes(',') && priceStr.includes('.')) {
                        priceVal = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
                    } else if (priceStr.includes(',')) {
                        priceVal = parseFloat(priceStr.replace(',', '.'));
                    } else {
                        priceVal = parseFloat(priceStr);
                    }
                }
            } else if (lowerKey.includes('ean') || lowerKey.includes('barras') || lowerKey.includes('codigo')) {
                ean = String(val || '').trim();
            } else if (lowerKey.includes('distribuidora')) {
                distributorName = String(val || 'Planilha Principal').trim();
            }
        }

        // Ignorar linhas inválidas ou "TOTAL GERAL"
        if (!name || name === 'TOTAL GERAL' || isNaN(priceVal) || priceVal <= 0) {
            errorCount++;
            continue;
        }

        try {
            // 3. Garantir Distribuidora
            let { data: distributor, error: distError } = await supabase
                .from('distributors')
                .select('id')
                .eq('name', distributorName)
                .maybeSingle();

            if (!distributor) {
                const { data: newDist, error: createDistError } = await supabase
                    .from('distributors')
                    .insert([{ name: distributorName }])
                    .select()
                    .single();
                if (createDistError) throw createDistError;
                distributor = newDist;
            }

            // 4. Upsert Produto (usando nome como chave única para simplificar importação principal)
            let { data: product, error: prodError } = await supabase
                .from('products')
                .select('id')
                .eq('name', name)
                .maybeSingle();

            if (!product) {
                const { data: newProd, error: createProdError } = await supabase
                    .from('products')
                    .insert([{
                        name: name,
                        ean: ean || null,
                        category: 'generico',
                        unit: 'cx'
                    }])
                    .select()
                    .single();
                if (createProdError) throw createProdError;
                product = newProd;
            } else if (ean && !product.ean) {
                // Atualizar EAN se o produto existir mas não tiver EAN
                await supabase.from('products').update({ ean }).eq('id', product.id);
            }

            // 5. Inserir Preço
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
            if (successCount % 100 === 0) {
                console.log(`Progresso: ${successCount} processados...`);
            }

        } catch (err) {
            console.error(`Erro ao processar ${name}:`, err.message);
            errorCount++;
        }
    }

    console.log('\n--- Resultado da Importação ---');
    console.log(`Sucesso: ${successCount}`);
    console.log(`Ignorados/Erro: ${errorCount}`);
    console.log('-------------------------------');
}

run().catch(console.error);
