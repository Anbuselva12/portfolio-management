-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: database
-- Generation Time: Oct 06, 2026 at 12:02 PM
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
-- Table structure for table `ASG_EXPENSE_TYPE`
--

CREATE TABLE IF NOT EXISTS `ASG_EXPENSE_TYPE` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `VALUE` varchar(255) DEFAULT NULL,
  `IS_ACTIVE` bit(1) DEFAULT NULL,
  `SORT_ORDER` int(11) DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Dumping data for table `ASG_EXPENSE_TYPE`
--

INSERT INTO `ASG_EXPENSE_TYPE` (`ID`, `VALUE`, `IS_ACTIVE`, `SORT_ORDER`) VALUES
(1, 'Bricks', b'1', 1),
(2, 'Jalli (Size 0.75)', b'1', 2),
(3, 'Jalli (Size 1.5)', b'1', 3),
(4, 'Cement', b'1', 4),
(5, 'Steels 10 mm', b'1', 5),
(6, 'Steels 8 mm', b'1', 6),
(7, 'Steels 6 mm', b'1', 7),
(8, 'M Sand', b'1', 8),
(9, 'P Sand', b'1', 9),
(10, 'Filler Sand', b'1', 10),
(11, 'Filler House Debris', b'1', 11),
(12, 'Steels Related', b'1', 8),
(13, 'Other Misc', b'1', 12),
(14, 'Steels 12 mm', b'1', 8),
(15, 'Electrical Item', b'1', NULL),
(16, 'Plumbing Item', b'1', NULL),
(17, 'Tiles', b'1', NULL),
(18, 'Labour Cost', b'1', NULL),
(19, 'Steels 16 mm', b'1', 8),
(20, 'Wood Items', b'1', 10),
(21, 'Paint Related', b'1', 10),
(22, 'Tiles Labour', b'1', NULL);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
