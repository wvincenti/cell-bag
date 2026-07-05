/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.7.2-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: cell_master
-- ------------------------------------------------------
-- Server version	11.5.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `cell_values`
--

DROP TABLE IF EXISTS `cell_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cell_values` (
  `sheet_id` bigint(20) unsigned NOT NULL,
  `row_index` bigint(20) unsigned NOT NULL,
  `col_index` smallint(5) unsigned NOT NULL,
  `val_datetime` datetime DEFAULT NULL,
  `val_string` varchar(255) DEFAULT NULL,
  `val_text` text DEFAULT NULL,
  `val_numeric` decimal(18,6) DEFAULT NULL,
  `val_bool` tinyint(1) DEFAULT NULL,
  `val_currency` decimal(19,4) DEFAULT NULL,
  `val_formula` text DEFAULT NULL,
  `data_type` enum('text','numeric','string','currency','bool','datetime','percentage','formula') NOT NULL DEFAULT 'string',
  PRIMARY KEY (`sheet_id`,`row_index`,`col_index`),
  KEY `cell_values_sheet_cols_FK` (`col_index`),
  CONSTRAINT `cell_values_cells_FK` FOREIGN KEY (`sheet_id`, `row_index`, `col_index`) REFERENCES `cells` (`sheet_id`, `row_index`, `col_index`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cells`
--

DROP TABLE IF EXISTS `cells`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cells` (
  `sheet_id` bigint(20) unsigned NOT NULL,
  `row_index` bigint(20) unsigned NOT NULL,
  `col_index` smallint(5) unsigned NOT NULL,
  `display_val` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`sheet_id`,`row_index`,`col_index`),
  KEY `cells_sheet_cols_FK` (`sheet_id`,`col_index`),
  CONSTRAINT `cells_sheet_cols_FK` FOREIGN KEY (`sheet_id`, `col_index`) REFERENCES `sheet_cols` (`sheet_id`, `index`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cells_sheet_rows_FK` FOREIGN KEY (`sheet_id`, `row_index`) REFERENCES `sheet_rows` (`sheet_id`, `index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `row_connections`
--

DROP TABLE IF EXISTS `row_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `row_connections` (
  `sheet_a` bigint(20) unsigned NOT NULL,
  `row_a` bigint(20) unsigned NOT NULL,
  `sheet_b` bigint(20) unsigned NOT NULL,
  `row_b` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`sheet_a`,`row_a`,`sheet_b`,`row_b`),
  KEY `row_connections_sheet_rows_FK_1` (`sheet_b`,`row_b`),
  CONSTRAINT `row_connections_sheet_rows_FK` FOREIGN KEY (`sheet_a`, `row_a`) REFERENCES `sheet_rows` (`sheet_id`, `index`) ON DELETE CASCADE,
  CONSTRAINT `row_connections_sheet_rows_FK_1` FOREIGN KEY (`sheet_b`, `row_b`) REFERENCES `sheet_rows` (`sheet_id`, `index`) ON DELETE CASCADE,
  CONSTRAINT `row_connections_check` CHECK ((`sheet_a`,`row_a`) <= (`sheet_b`,`row_b`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sheet_cols`
--

DROP TABLE IF EXISTS `sheet_cols`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sheet_cols` (
  `sheet_id` bigint(20) unsigned NOT NULL,
  `index` smallint(5) unsigned NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `data_type` enum('text','numeric','string','currency','bool','datetime','percentage','formula') NOT NULL DEFAULT 'string',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `update_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`sheet_id`,`index`),
  CONSTRAINT `sheet_cols_sheets_FK` FOREIGN KEY (`sheet_id`) REFERENCES `sheets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sheet_connections`
--

DROP TABLE IF EXISTS `sheet_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sheet_connections` (
  `sheet_a` bigint(20) unsigned NOT NULL,
  `sheet_b` bigint(20) unsigned NOT NULL,
  `sheet_a_number` bigint(20) unsigned NOT NULL DEFAULT `sheet_a`,
  `sheet_b_number` bigint(20) unsigned NOT NULL DEFAULT `sheet_b`,
  PRIMARY KEY (`sheet_a`,`sheet_b`),
  UNIQUE KEY `sheet_connections_unique` (`sheet_a_number`,`sheet_b_number`),
  KEY `sheet_connections_sheets_FK_1` (`sheet_b`),
  CONSTRAINT `sheet_connections_sheets_FK` FOREIGN KEY (`sheet_a`) REFERENCES `sheets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sheet_connections_sheets_FK_1` FOREIGN KEY (`sheet_b`) REFERENCES `sheets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sheet_connections_check` CHECK (`sheet_a_number` < `sheet_b_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sheet_rows`
--

DROP TABLE IF EXISTS `sheet_rows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sheet_rows` (
  `sheet_id` bigint(20) unsigned NOT NULL,
  `index` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`sheet_id`,`index`),
  CONSTRAINT `sheet_rows_sheets_FK` FOREIGN KEY (`sheet_id`) REFERENCES `sheets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sheets`
--

DROP TABLE IF EXISTS `sheets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sheets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `visibility` enum('public','private') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'private',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `last_login` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users_sheets`
--

DROP TABLE IF EXISTS `users_sheets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_sheets` (
  `user_id` bigint(20) unsigned NOT NULL,
  `sheet_id` bigint(20) unsigned NOT NULL,
  `permission` enum('admin','read','write') NOT NULL DEFAULT 'read',
  PRIMARY KEY (`user_id`,`sheet_id`),
  KEY `users_sheets_sheets_FK` (`sheet_id`),
  CONSTRAINT `users_sheets_sheets_FK` FOREIGN KEY (`sheet_id`) REFERENCES `sheets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `users_sheets_users_FK` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'cell_master'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-07-05 10:38:00
