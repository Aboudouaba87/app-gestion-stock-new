-- Ajout de la colonne category_id dans la table product_warehouses
LTER TABLE product_warehouses
ADD category_id INT

ALTER TABLE product_warehouses
ADD CONSTRAINT fk_category
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE CASCADE
ON UPDATE CASCADE