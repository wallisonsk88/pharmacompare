-- ============================================
-- SCRIPT DE IMPORTAÇÃO DE PRODUTOS - SUPABASE
-- ============================================
-- Cole este script no SQL Editor do Supabase
-- Acesse: https://supabase.com/dashboard > Seu Projeto > SQL Editor
-- ============================================

-- INSTRUÇÕES:
-- 1. Copie e cole os produtos no formato abaixo
-- 2. Cada linha: ('NOME DO PRODUTO', 'CODIGO EAN')
-- 3. Se não tiver EAN, use NULL
-- 4. Execute o script (Ctrl+Enter ou botão Run)

INSERT INTO products (name, ean, manufacturer, category, unit) VALUES
-- ============================================
-- COLE SEUS PRODUTOS AQUI (um por linha)
-- ============================================
('DIPIRONA 500MG 20 COMP', '7896000000001', '', 'generico', 'cx'),
('PARACETAMOL 750MG 20 COMP', '7896000000002', '', 'generico', 'cx'),
('IBUPROFENO 600MG 20 COMP', '7896000000003', '', 'generico', 'cx'),
('AMOXICILINA 500MG 21 CAPS', '7896000000004', '', 'generico', 'cx'),
('OMEPRAZOL 20MG 28 CAPS', '7896000000005', '', 'generico', 'cx'),
('LOSARTANA 50MG 30 COMP', '7896000000006', '', 'generico', 'cx'),
('ATENOLOL 50MG 30 COMP', '7896000000007', '', 'generico', 'cx'),
('SINVASTATINA 20MG 30 COMP', '7896000000008', '', 'generico', 'cx'),
('METFORMINA 850MG 30 COMP', '7896000000009', '', 'generico', 'cx'),
('CAPTOPRIL 25MG 30 COMP', NULL, '', 'generico', 'cx')
-- ============================================
-- ADICIONE MAIS PRODUTOS ACIMA (não esqueça a vírgula!)
-- O ÚLTIMO PRODUTO NÃO TEM VÍRGULA NO FINAL
-- ============================================
;

-- Verificar quantos produtos foram inseridos
SELECT COUNT(*) as total_produtos FROM products;
