ALTER TABLE `products` ADD `category` varchar(80) DEFAULT 'Lainnya' NOT NULL;
ALTER TABLE `products` ADD `category` varchar(80) NOT NULL DEFAULT 'Lainnya' AFTER `name`;
