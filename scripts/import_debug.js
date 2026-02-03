// Script para importar preços diretamente - debug completo
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import * as XLSX from 'xlsx';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CSV_PATH = 'C:/Users/Wallison Meganet/Desktop/Produtos/PRODUTOS SISTEMA BASE.csv';

async function importPrices() {
    console.log('=== Importação Direta com Debug ===\n');

    // 1. Verificar arquivo
    if (!fs.existsSync(CSV_PATH)) {
        console.error('Arquivo não encontrado:', CSV_PATH);
        return;
    }

    // 2. Ler arquivo
    console.log('Lendo arquivo...');
    const data = fs.readFileSync(CSV_PATH);
    const workbook = XLSX.read(data, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log('Total de linhas:', rows.length);
    console.log('Cabeçalho:', rows[0]);
    console.log('Primeira linha de dados:', rows[1]);

    // 3. Identificar colunas - LÓGICA CORRIGIDA
    const header = rows[0].map(h => String(h || '').toLowerCase());
    console.log('\nCabeçalho normalizado:', header);

    // Sempre usar primeira coluna como produto
    let productCol = 0;
    let priceCol = -1;
    let eanCol = -1;

    // Detectar EAN por cabeçalho
    header.forEach((h, i) => {
        if (eanCol === -1 && (h.includes('ean') || h.includes('gtin'))) {
            eanCol = i;
        }
    });

    // Detectar preço pelo conteúdo dos dados (procura por "R$")
    for (let i = 0; i < rows[1].length; i++) {
        const val = String(rows[1][i] || '');
        if (val.includes('R$') || val.includes('r$')) {
            priceCol = i;
            console.log(`Coluna de preço detectada: ${i} (valor: "${val}")`);
            break;
        }
    }

    // Fallback: segunda coluna
    if (priceCol === -1) {
        priceCol = 1;
        console.log('Fallback: usando coluna 1 como preço');
    }

    console.log('\n=== Colunas Detectadas ===');
    console.log('Produto:', productCol, '/ Preço:', priceCol, '/ EAN:', eanCol);

    // 4. Mostrar exemplos de dados
    console.log('\n=== Exemplos de Dados ===');
    for (let i = 1; i <= Math.min(5, rows.length - 1); i++) {
        const row = rows[i];
        const rawPrice = row[priceCol];
        let priceStr = String(rawPrice || '');
        const originalPrice = priceStr;

        // Limpeza
        priceStr = priceStr.replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        const priceVal = parseFloat(priceStr);

        console.log(`Linha ${i}:`);
        console.log(`  Produto: "${row[productCol]}"`);
        console.log(`  Preço raw: "${rawPrice}" (tipo: ${typeof rawPrice})`);
        console.log(`  Preço limpo: "${priceStr}"`);
        console.log(`  Preço parsed: ${priceVal} (válido: ${!isNaN(priceVal) && priceVal > 0})`);
    }

    // 5. Buscar distribuidora
    const { data: distributor } = await supabase
        .from('distributors')
        .select('*')
        .single();

    if (!distributor) {
        console.error('Nenhuma distribuidora encontrada!');
        return;
    }
    console.log('\nDistribuidora:', distributor.name, 'ID:', distributor.id);

    // 6. Buscar produtos existentes
    const { data: products } = await supabase.from('products').select('*');
    console.log('Produtos no banco:', products.length);

    const productsMap = {};
    products.forEach(p => {
        productsMap[p.name.toLowerCase().trim()] = p;
    });

    // 7. Preparar preços
    console.log('\n=== Preparando Preços ===');
    const pricesToCreate = [];
    let matched = 0, notMatched = 0, invalidPrice = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const productName = String(row[productCol] || '').trim();
        let priceStr = String(row[priceCol] || '');

        priceStr = priceStr.replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        const priceVal = parseFloat(priceStr);

        if (!productName || productName.length < 2) continue;
        if (isNaN(priceVal) || priceVal <= 0) {
            invalidPrice++;
            continue;
        }

        const product = productsMap[productName.toLowerCase().trim()];
        if (product) {
            pricesToCreate.push({
                product_id: product.id,
                distributor_id: distributor.id,
                price: priceVal,
                min_quantity: 1,
                validity: null
            });
            matched++;
        } else {
            notMatched++;
            if (notMatched <= 5) {
                console.log(`Não encontrado: "${productName}"`);
            }
        }
    }

    console.log(`\nMatched: ${matched}, Not Matched: ${notMatched}, Invalid Price: ${invalidPrice}`);
    console.log('Total de preços a inserir:', pricesToCreate.length);

    if (pricesToCreate.length === 0) {
        console.log('\n❌ Nenhum preço para inserir!');
        return;
    }

    // 8. Inserir preços em lotes
    console.log('\n=== Inserindo Preços ===');
    const BATCH_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < pricesToCreate.length; i += BATCH_SIZE) {
        const batch = pricesToCreate.slice(i, i + BATCH_SIZE);

        const { data: inserted, error } = await supabase
            .from('prices')
            .insert(batch)
            .select();

        if (error) {
            console.error(`Erro no lote ${i / BATCH_SIZE + 1}:`, error);
            errorCount += batch.length;
        } else {
            successCount += inserted.length;
            console.log(`Lote ${i / BATCH_SIZE + 1}: ${inserted.length} inseridos`);
        }
    }

    console.log(`\n=== Resultado ===`);
    console.log(`Sucesso: ${successCount}, Erros: ${errorCount}`);

    // 9. Verificar
    const { count } = await supabase
        .from('prices')
        .select('*', { count: 'exact', head: true });

    console.log(`Total de preços no banco agora: ${count}`);
}

importPrices().catch(console.error);
