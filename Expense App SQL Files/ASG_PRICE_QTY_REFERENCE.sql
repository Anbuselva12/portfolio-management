-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: database
-- Generation Time: Oct 06, 2026 at 12:03 PM
-- Server version: 10.11.18-MariaDB-log
-- PHP Version: 8.3.31

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `Appian`
--

-- --------------------------------------------------------

--
-- Table structure for table `ASG_PRICE_QTY_REFERENCE`
--

CREATE TABLE IF NOT EXISTS `ASG_PRICE_QTY_REFERENCE` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `VALUE` varchar(255) DEFAULT NULL,
  `IS_ACTIVE` bit(1) DEFAULT NULL,
  `SORT_ORDER` int(11) DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Dumping data for table `ASG_PRICE_QTY_REFERENCE`
--

INSERT INTO `ASG_PRICE_QTY_REFERENCE` (`ID`, `VALUE`, `IS_ACTIVE`, `SORT_ORDER`) VALUES
(1, 'Kg', b'1', 1),
(2, 'Unit', b'1', 2),
(3, 'Piece', b'1', 3),
(4, 'Bundle', b'1', 4),
(5, '1 Bag', b'1', 5),
(6, 'Time (Hours)', b'1', 6),
(7, 'Driver', b'1', 7);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
