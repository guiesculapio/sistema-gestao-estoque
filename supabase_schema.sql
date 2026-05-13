-- ═══════════════════════════════════════════════════════════════════════════════
-- SCHEMA: Sistema de Gestão de Estoque
-- Database: PostgreSQL (Supabase)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABELA: PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  
  -- Informações básicas
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  sku VARCHAR(50) UNIQUE,
  barcode VARCHAR(50) UNIQUE,
  category VARCHAR(100) NOT NULL,
  
  -- Preços
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  cost_price DECIMAL(10, 2) CHECK (cost_price >= 0),
  
  -- Estoque
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  
  -- Status
  status VARCHAR(20) DEFAULT 'em_estoque' 
    CHECK (status IN ('em_estoque', 'estoque_baixo', 'esgotado', 'descontinuado')),
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT price_greater_than_cost CHECK (price >= COALESCE(cost_price, 0))
);

-- Índices para melhor performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_created_at ON products(created_at);

-- Comentários para documentação
COMMENT ON TABLE products IS 'Tabela de produtos do sistema de estoque';
COMMENT ON COLUMN products.current_stock IS 'Quantidade atual em estoque. Não pode ser negativa.';
COMMENT ON COLUMN products.min_stock IS 'Quantidade mínima para alerta de reposição';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABELA: INVENTORY_MOVEMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  
  -- Referência ao produto
  product_id BIGINT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  
  -- Tipo de movimento
  type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
  
  -- Dados do movimento
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason VARCHAR(100) NOT NULL,
  
  -- Informações de venda (opcional, para rastreabilidade)
  sale_id VARCHAR(50),
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_movement CHECK (
    (type = 'IN' AND quantity > 0) OR 
    (type = 'OUT' AND quantity > 0)
  )
);

-- Índices para performance
CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(type);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX idx_inventory_movements_sale_id ON inventory_movements(sale_id) WHERE sale_id IS NOT NULL;

-- Comentários
COMMENT ON TABLE inventory_movements IS 'Histórico de todas as movimentações de estoque (entradas e saídas)';
COMMENT ON COLUMN inventory_movements.type IS 'IN = Entrada, OUT = Saída';
COMMENT ON COLUMN inventory_movements.reason IS 'Motivo da movimentação: venda, devolução, ajuste, reposição, etc.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TRIGGER: Atualizar 'updated_at' em products
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_product_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_timestamp
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_timestamp();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TRIGGER: Atualizar status do produto baseado no estoque
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_product_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stock <= 0 THEN
    NEW.status = 'esgotado';
  ELSIF NEW.current_stock <= NEW.min_stock THEN
    NEW.status = 'estoque_baixo';
  ELSE
    NEW.status = 'em_estoque';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_status
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_status();


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TRIGGER: Atualizar 'current_stock' automaticamente após movimentação
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_stock_after_movement()
RETURNS TRIGGER AS $$
DECLARE
  new_stock INTEGER;
BEGIN
  -- Calcular novo estoque baseado no tipo de movimento
  IF NEW.type = 'IN' THEN
    new_stock = (SELECT current_stock FROM products WHERE id = NEW.product_id) + NEW.quantity;
  ELSIF NEW.type = 'OUT' THEN
    new_stock = (SELECT current_stock FROM products WHERE id = NEW.product_id) - NEW.quantity;
  END IF;
  
  -- Verificar se o novo estoque seria negativo
  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente: tentativa de remover % unidades, mas há apenas % em estoque',
      NEW.quantity,
      (SELECT current_stock FROM products WHERE id = NEW.product_id);
  END IF;
  
  -- Atualizar o estoque do produto
  UPDATE products 
  SET current_stock = new_stock 
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_after_movement
AFTER INSERT ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION update_stock_after_movement();


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. VIEW: Resumo de Movimentações por Produto
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW product_movement_summary AS
SELECT 
  p.id,
  p.name,
  p.category,
  p.current_stock,
  p.min_stock,
  COALESCE(SUM(CASE WHEN im.type = 'IN' THEN im.quantity ELSE 0 END), 0) as total_inbound,
  COALESCE(SUM(CASE WHEN im.type = 'OUT' THEN im.quantity ELSE 0 END), 0) as total_outbound,
  COUNT(DISTINCT im.id) as total_movements,
  MAX(im.created_at) as last_movement_date
FROM products p
LEFT JOIN inventory_movements im ON p.id = im.product_id
GROUP BY p.id, p.name, p.category, p.current_stock, p.min_stock
ORDER BY p.name;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. DADOS DE EXEMPLO (Descomente para testar)
-- ─────────────────────────────────────────────────────────────────────────────

-- INSERT INTO products (name, description, sku, barcode, category, price, cost_price, current_stock, min_stock)
-- VALUES 
--   ('Cabo HDMI 2.1 2m', 'Cabo HDMI de alta velocidade', 'SKU001', '789001', 'Cabos', 49.90, 28.00, 10, 5),
--   ('Cadeira Ergonômica Flexform', 'Cadeira com suporte lombar ajustável', 'SKU002', '789002', 'Mobiliário', 1850.00, 980.00, 5, 2);

-- INSERT INTO inventory_movements (product_id, type, quantity, reason)
-- VALUES 
--   (1, 'IN', 20, 'reposição'),
--   (1, 'OUT', 5, 'venda'),
--   (2, 'IN', 3, 'reposição');
