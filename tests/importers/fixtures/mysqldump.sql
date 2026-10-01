-- MySQL dump 10.13  Distrib 8.0.34, for Linux (x86_64)
--
-- Host: localhost    Database: shop
-- ------------------------------------------------------
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
CREATE TABLE `customers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `kind` enum('retail','wholesale') NOT NULL DEFAULT 'retail',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `notes` text COMMENT 'it''s -- a comment; with semicolon',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_email` (`email`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Shop customers';
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'a@b.c','O\'Brien -- x',0.00,1,'retail','2020-01-01 00:00:00',NULL,'n;ote');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

CREATE TABLE `orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customer_id` int unsigned NOT NULL,
  `placed_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `total` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_orders_customer` (`customer_id`),
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_lines` (
  `order_id` bigint NOT NULL,
  `line` int NOT NULL,
  `sku` varchar(32) NOT NULL,
  `qty` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`order_id`,`line`),
  UNIQUE KEY `uniq_sku` (`order_id`,`sku`),
  CONSTRAINT `fk_lines_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `customer_profiles` (
  `customer_id` int unsigned NOT NULL,
  `bio` text,
  PRIMARY KEY (`customer_id`),
  CONSTRAINT `fk_profile_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB;

DELIMITER ;;
CREATE TRIGGER `orders_bi` BEFORE INSERT ON `orders` FOR EACH ROW BEGIN
  SET NEW.total = IFNULL(NEW.total, 0);
END ;;
DELIMITER ;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
