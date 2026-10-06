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
-- Table structure for table `ASG_TAG_ITEMS`
--

CREATE TABLE IF NOT EXISTS `ASG_TAG_ITEMS` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `VALUE` varchar(255) DEFAULT NULL,
  `IS_ACTIVE` bit(1) DEFAULT NULL,
  `SORT_ORDER` int(11) DEFAULT NULL,
  `HEXA_COLOR_CODE` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Dumping data for table `ASG_TAG_ITEMS`
--

INSERT INTO `ASG_TAG_ITEMS` (`ID`, `VALUE`, `IS_ACTIVE`, `SORT_ORDER`, `HEXA_COLOR_CODE`) VALUES
(1, 'Steels', b'1', 1, '#6E7B8B'),
(2, 'Bricks', b'1', 2, '#B22222'),
(3, 'M Sand', b'1', 3, '#D2B48C'),
(4, 'P Sand', b'1', 4, '#F4A460'),
(5, 'Filling Sand', b'1', 5, '#EDC9AF'),
(6, 'Jalli', b'1', 6, '#FF8C00'),
(7, 'Misc', b'1', 7, '#6A5ACD'),
(8, 'Cement', b'1', 8, '#C7C7C7'),
(9, 'Electrical', b'1', NULL, '#FFC107'),
(10, 'Plumbing', b'1', NULL, '#03A9F4'),
(11, 'Tiles', b'1', NULL, '#607D8B'),
(12, 'Labour Cost', b'1', NULL, '#E53935'),
(13, 'Driver', b'1', NULL, '#8BC34A'),
(14, 'Wood', b'1', NULL, '#8BC34A'),
(15, 'Paint', b'1', NULL, '#8BC34A'),
(16, 'Tiles Labour', b'1', NULL, '#607D8B');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
