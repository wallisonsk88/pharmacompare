// Script para importar tabela de referência (Nome + EAN) direto no Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import * as XLSX from 'xlsx';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// CONFIGURAÇÃO - Altere o caminho do arquivo aqui
// ============================================
const CSV_PATH = 'C:/Users/Wallison Meganet/Desktop/Produtos/SOMENTE PRODUTOS.csv';
// ============================================

async function importProducts() {
    console.log('=== Importação de Produtos (Nome + EAN) ===\n');

    // 1. Verificar arquivo
    if (!fs.existsSync(CSV_PATH)) {
        console.error('❌ Arquivo não encontrado:', CSV_PATH);
        console.log('\nAltere o caminho CSV_PATH no início deste arquivo.');
        return;
    }

    // 2. Ler arquivo
    console.log('📂 Lendo arquivo:', CSV_PATH);
    const data = fs.readFileSync(CSV_PATH);
    const workbook = XLSX.read(data, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log('📊 Total de linhas:', rows.length);
    console.log('📋 Cabeçalho:', rows[0]);

    // 3. Detectar colunas
    const header = rows[0].map(h => String(h || '').toLowerCase());

    let nameCol = 0; // Primeira coluna é o nome
    let eanCol = -1;

    // Detectar coluna de EAN
    header.forEach((h, i) => {
        if (h.includes('ean') || h.includes('gtin') || h.includes('barras') || h.includes('codigo')) {
            eanCol = i;
        }
    });

    console.log('\n🔍 Colunas detectadas:');
    console.log(`   Nome: coluna ${nameCol} (${header[nameCol]})`);
    console.log(`   EAN: coluna ${eanCol} (${eanCol >= 0 ? header[eanCol] : 'não encontrada'})`);

    // 4. Buscar produtos existentes
    console.log('\n📦 Buscando produtos existentes no banco...');
    const { data: existingProducts } = await supabase.from('products').select('name, ean');
    const existingNames = new Set(existingProducts?.map(p => p.name.toLowerCase().trim()) || []);
    const existingEans = new Set(existingProducts?.filter(p => p.ean).map(p => p.ean) || []);
    console.log(`   ${existingNames.size} produtos já cadastrados`);

    // 5. Preparar produtos para inserção
    const productsToInsert = [];
    let skipped = 0;
    let invalid = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = String(row[nameCol] || '').trim();
        const ean = eanCol >= 0 ? String(row[eanCol] || '').trim() : '';

        // Validar
        if (!name || name.length < 2) {
            invalid++;
            continue;
        }

        // Verificar se já existe (por nome ou EAN)
        if (existingNames.has(name.toLowerCase()) || (ean && existingEans.has(ean))) {
            skipped++;
            continue;
        }

        productsToInsert.push({
            name: name,
            ean: ean || null,
            manufacturer: '',
            category: 'generico',
            unit: 'cx'
        });

        // Adicionar ao set para evitar duplicatas dentro do mesmo arquivo
        existingNames.add(name.toLowerCase());
        if (ean) existingEans.add(ean);
    }

    console.log(`\n📋 Resumo:`);
    console.log(`   ✅ Produtos a inserir: ${productsToInsert.length}`);
    console.log(`   ⏭️ Já existentes (skip): ${skipped}`);
    console.log(`   ❌ Inválidos: ${invalid}`);

    if (productsToInsert.length === 0) {
        console.log('\n✨ Nenhum produto novo para inserir!');
        return;
    }

    // 6. Inserir em lotes
    console.log('\n🚀 Inserindo produtos no Supabase...');
    const BATCH_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
        const batch = productsToInsert.slice(i, i + BATCH_SIZE);

        const { data: inserted, error } = await supabase
            .from('products')
            .insert(batch)
            .select();

        if (error) {
            console.error(`   ❌ Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
            errorCount += batch.length;
        } else {
            successCount += inserted.length;
            console.log(`   ✅ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${inserted.length} inseridos`);
        }
    }

    // 7. Resultado final
    console.log('\n=== RESULTADO FINAL ===');
    console.log(`✅ Sucesso: ${successCount} produtos inseridos`);
    if (errorCount > 0) console.log(`❌ Erros: ${errorCount}`);

    // Verificar total no banco
    const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total de produtos no banco agora: ${count}`);
}

importProducts().catch(console.error);
