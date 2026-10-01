-- V42: Thêm cột note cho order_items (tối đa 500 ký tự, cho phép NULL)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note varchar(500);
