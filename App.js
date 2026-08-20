import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Animated, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

// Palette resserrée à 2 couleurs principales + variations fonctionnelles,
// partagée par tout l'écran (liste, détail, choix, quiz) pour une identité
// visuelle cohérente :
// - navy/blue : couleur de marque (fond du dashboard, titres, action
//   principale « Développer », progression) — navy = teinte sombre, blue =
//   teinte vive, même famille.
// - gold : accent unique pour tout ce qui touche au score/récompenses.
// Le reste (teal, success, danger) sont des variations fonctionnelles
// ponctuelles (action secondaire, état positif, mauvaise réponse), pas des
// couleurs de marque supplémentaires.
const COLORS = {
  canvas: '#f5f2ea',
  surface: '#ffffff',
  navy: '#16233a',
  navySoft: 'rgba(22, 35, 58, 0.06)',
  blue: '#2f5fd6',
  blueSoft: 'rgba(47, 95, 214, 0.10)',
  gold: '#c98a2b',
  goldSoft: 'rgba(201, 138, 43, 0.14)',
  teal: '#1a9098',
  success: '#1f9d63',
  danger: '#c94a3a',
  muted: '#6b7484',
  border: '#eae5d8',
  track: '#ece6d8',
  disabled: '#d9d3c2',
};

// Les ~195 États reconnus (193 membres de l'ONU + Vatican + Palestine),
// triés par superficie croissante. areaKm2/population sont les valeurs
// brutes utilisées pour le calcul du score et des seuils ; area est la
// chaîne déjà formatée pour l'affichage (gère les décimales de
// Vatican/Monaco). gdp et military sont en millions de dollars (PIB nominal
// et budget militaire annuel), wealth est le PIB par habitant en dollars —
// trois valeurs approximatives à but ludique/pédagogique (pas des chiffres
// officiels au dollar près), de même que area/population pour les pays les
// moins documentés. capital, language et continent alimentent les questions
// de quiz (voir QUIZ_QUESTION_TYPES). Pour ajouter un pays : une entrée
// { id, name, area, areaKm2, population, gdp, military, wealth, flag,
// capital, language, continent }, plus l'entrée correspondante (même index)
// dans COUNTRY_COORDS.
const COUNTRIES = [
  { id: 'va', name: 'Vatican', area: '0,44 km²', areaKm2: 0.44, population: 800, gdp: 20, military: 10, wealth: 90000, flag: '🇻🇦', capital: 'Cité du Vatican', language: 'Italien', continent: 'Europe' },
  { id: 'mc', name: 'Monaco', area: '2,1 km²', areaKm2: 2.1, population: 39000, gdp: 8700, military: 15, wealth: 234000, flag: '🇲🇨', capital: 'Monaco-Ville', language: 'Français', continent: 'Europe' },
  { id: 'nr', name: 'Nauru', area: '21 km²', areaKm2: 21, population: 12000, gdp: 150, military: 5, wealth: 12500, flag: '🇳🇷', capital: 'Yaren', language: 'Nauruan', continent: 'Océanie' },
  { id: 'tv', name: 'Tuvalu', area: '26 km²', areaKm2: 26, population: 11000, gdp: 65, military: 5, wealth: 5900, flag: '🇹🇻', capital: 'Funafuti', language: 'Tuvaluan', continent: 'Océanie' },
  { id: 'sm', name: 'Saint-Marin', area: '61 km²', areaKm2: 61, population: 34000, gdp: 1900, military: 2, wealth: 55000, flag: '🇸🇲', capital: 'Saint-Marin', language: 'Italien', continent: 'Europe' },
  { id: 'li', name: 'Liechtenstein', area: '160 km²', areaKm2: 160, population: 39000, gdp: 6900, military: 3, wealth: 180000, flag: '🇱🇮', capital: 'Vaduz', language: 'Allemand', continent: 'Europe' },
  { id: 'mh', name: 'Îles Marshall', area: '181 km²', areaKm2: 181, population: 42000, gdp: 280, military: 5, wealth: 6600, flag: '🇲🇭', capital: 'Majuro', language: 'Marshallais', continent: 'Océanie' },
  { id: 'kn', name: 'Saint-Christophe-et-Niévès', area: '261 km²', areaKm2: 261, population: 47000, gdp: 1100, military: 10, wealth: 22500, flag: '🇰🇳', capital: 'Basseterre', language: 'Anglais', continent: 'Amérique' },
  { id: 'mv', name: 'Maldives', area: '298 km²', areaKm2: 298, population: 520000, gdp: 6900, military: 60, wealth: 13300, flag: '🇲🇻', capital: 'Malé', language: 'Maldivien', continent: 'Asie' },
  { id: 'mt', name: 'Malte', area: '316 km²', areaKm2: 316, population: 530000, gdp: 17700, military: 80, wealth: 33000, flag: '🇲🇹', capital: 'La Valette', language: 'Maltais', continent: 'Europe' },
  { id: 'gd', name: 'Grenade', area: '344 km²', areaKm2: 344, population: 125000, gdp: 1400, military: 10, wealth: 11400, flag: '🇬🇩', capital: 'Saint-Georges', language: 'Anglais', continent: 'Amérique' },
  { id: 'vc', name: 'Saint-Vincent-et-les-Grenadines', area: '389 km²', areaKm2: 389, population: 104000, gdp: 1000, military: 10, wealth: 9700, flag: '🇻🇨', capital: 'Kingstown', language: 'Anglais', continent: 'Amérique' },
  { id: 'bb', name: 'Barbade', area: '430 km²', areaKm2: 430, population: 280000, gdp: 5700, military: 20, wealth: 20300, flag: '🇧🇧', capital: 'Bridgetown', language: 'Anglais', continent: 'Amérique' },
  { id: 'ag', name: 'Antigua-et-Barbuda', area: '442 km²', areaKm2: 442, population: 94000, gdp: 1900, military: 10, wealth: 20000, flag: '🇦🇬', capital: 'Saint John\'s', language: 'Anglais', continent: 'Amérique' },
  { id: 'sc', name: 'Seychelles', area: '455 km²', areaKm2: 455, population: 100000, gdp: 1900, military: 20, wealth: 19000, flag: '🇸🇨', capital: 'Victoria', language: 'Créole seychellois', continent: 'Afrique' },
  { id: 'pw', name: 'Palaos', area: '459 km²', areaKm2: 459, population: 18000, gdp: 260, military: 5, wealth: 14400, flag: '🇵🇼', capital: 'Ngerulmud', language: 'Palauan', continent: 'Océanie' },
  { id: 'ad', name: 'Andorre', area: '468 km²', areaKm2: 468, population: 80000, gdp: 3300, military: 5, wealth: 42000, flag: '🇦🇩', capital: 'Andorre-la-Vieille', language: 'Catalan', continent: 'Europe' },
  { id: 'lc', name: 'Sainte-Lucie', area: '616 km²', areaKm2: 616, population: 180000, gdp: 2500, military: 10, wealth: 13600, flag: '🇱🇨', capital: 'Castries', language: 'Anglais', continent: 'Amérique' },
  { id: 'fm', name: 'Micronésie', area: '702 km²', areaKm2: 702, population: 113000, gdp: 430, military: 5, wealth: 3800, flag: '🇫🇲', capital: 'Palikir', language: 'Anglais', continent: 'Océanie' },
  { id: 'sg', name: 'Singapour', area: '728 km²', areaKm2: 728, population: 5900000, gdp: 501000, military: 13000, wealth: 84000, flag: '🇸🇬', capital: 'Singapour', language: 'Anglais', continent: 'Asie' },
  { id: 'to', name: 'Tonga', area: '747 km²', areaKm2: 747, population: 107000, gdp: 500, military: 5, wealth: 4700, flag: '🇹🇴', capital: 'Nuku\'alofa', language: 'Tongien', continent: 'Océanie' },
  { id: 'dm', name: 'Dominique', area: '751 km²', areaKm2: 751, population: 73000, gdp: 650, military: 10, wealth: 8700, flag: '🇩🇲', capital: 'Roseau', language: 'Anglais', continent: 'Amérique' },
  { id: 'bh', name: 'Bahreïn', area: '786 km²', areaKm2: 786, population: 1500000, gdp: 44000, military: 1600, wealth: 29500, flag: '🇧🇭', capital: 'Manama', language: 'Arabe', continent: 'Asie' },
  { id: 'ki', name: 'Kiribati', area: '811 km²', areaKm2: 811, population: 130000, gdp: 250, military: 5, wealth: 1900, flag: '🇰🇮', capital: 'Tarawa-Sud', language: 'Gilbertin', continent: 'Océanie' },
  { id: 'st', name: 'Sao Tomé-et-Principe', area: '964 km²', areaKm2: 964, population: 230000, gdp: 600, military: 10, wealth: 2500, flag: '🇸🇹', capital: 'São Tomé', language: 'Portugais', continent: 'Afrique' },
  { id: 'mu', name: 'Maurice', area: '2 040 km²', areaKm2: 2040, population: 1270000, gdp: 14000, military: 30, wealth: 11000, flag: '🇲🇺', capital: 'Port-Louis', language: 'Anglais', continent: 'Afrique' },
  { id: 'km', name: 'Comores', area: '2 235 km²', areaKm2: 2235, population: 850000, gdp: 1400, military: 10, wealth: 1600, flag: '🇰🇲', capital: 'Moroni', language: 'Comorien', continent: 'Afrique' },
  { id: 'lu', name: 'Luxembourg', area: '2 586 km²', areaKm2: 2586, population: 660000, gdp: 85000, military: 500, wealth: 128000, flag: '🇱🇺', capital: 'Luxembourg', language: 'Luxembourgeois', continent: 'Europe' },
  { id: 'ws', name: 'Samoa', area: '2 842 km²', areaKm2: 2842, population: 220000, gdp: 900, military: 10, wealth: 4100, flag: '🇼🇸', capital: 'Apia', language: 'Samoan', continent: 'Océanie' },
  { id: 'cv', name: 'Cap-Vert', area: '4 033 km²', areaKm2: 4033, population: 600000, gdp: 2400, military: 20, wealth: 4200, flag: '🇨🇻', capital: 'Praia', language: 'Portugais', continent: 'Afrique' },
  { id: 'tt', name: 'Trinité-et-Tobago', area: '5 130 km²', areaKm2: 5130, population: 1400000, gdp: 27000, military: 300, wealth: 19000, flag: '🇹🇹', capital: 'Port-d\'Espagne', language: 'Anglais', continent: 'Amérique' },
  { id: 'bn', name: 'Brunei', area: '5 765 km²', areaKm2: 5765, population: 450000, gdp: 15000, military: 500, wealth: 32000, flag: '🇧🇳', capital: 'Bandar Seri Begawan', language: 'Malais', continent: 'Asie' },
  { id: 'ps', name: 'Palestine', area: '6 220 km²', areaKm2: 6220, population: 5400000, gdp: 17000, military: 0, wealth: 3400, flag: '🇵🇸', capital: 'Ramallah', language: 'Arabe', continent: 'Asie' },
  { id: 'cy', name: 'Chypre', area: '9 251 km²', areaKm2: 9251, population: 1250000, gdp: 32000, military: 500, wealth: 32000, flag: '🇨🇾', capital: 'Nicosie', language: 'Grec', continent: 'Europe' },
  { id: 'lb', name: 'Liban', area: '10 452 km²', areaKm2: 10452, population: 5400000, gdp: 22000, military: 1500, wealth: 4100, flag: '🇱🇧', capital: 'Beyrouth', language: 'Arabe', continent: 'Asie' },
  { id: 'jm', name: 'Jamaïque', area: '10 991 km²', areaKm2: 10991, population: 2800000, gdp: 19000, military: 100, wealth: 6700, flag: '🇯🇲', capital: 'Kingston', language: 'Anglais', continent: 'Amérique' },
  { id: 'gm', name: 'Gambie', area: '11 295 km²', areaKm2: 11295, population: 2700000, gdp: 2400, military: 30, wealth: 850, flag: '🇬🇲', capital: 'Banjul', language: 'Anglais', continent: 'Afrique' },
  { id: 'qa', name: 'Qatar', area: '11 586 km²', areaKm2: 11586, population: 2900000, gdp: 235000, military: 12000, wealth: 81000, flag: '🇶🇦', capital: 'Doha', language: 'Arabe', continent: 'Asie' },
  { id: 'vu', name: 'Vanuatu', area: '12 189 km²', areaKm2: 12189, population: 330000, gdp: 1000, military: 10, wealth: 3100, flag: '🇻🇺', capital: 'Port-Vila', language: 'Bichlamar', continent: 'Océanie' },
  { id: 'me', name: 'Monténégro', area: '13 812 km²', areaKm2: 13812, population: 620000, gdp: 6900, military: 100, wealth: 11000, flag: '🇲🇪', capital: 'Podgorica', language: 'Monténégrin', continent: 'Europe' },
  { id: 'bs', name: 'Bahamas', area: '13 943 km²', areaKm2: 13943, population: 410000, gdp: 13500, military: 60, wealth: 33000, flag: '🇧🇸', capital: 'Nassau', language: 'Anglais', continent: 'Amérique' },
  { id: 'tl', name: 'Timor oriental', area: '14 874 km²', areaKm2: 14874, population: 1400000, gdp: 2000, military: 30, wealth: 1500, flag: '🇹🇱', capital: 'Dili', language: 'Tétum', continent: 'Asie' },
  { id: 'sz', name: 'Eswatini', area: '17 364 km²', areaKm2: 17364, population: 1200000, gdp: 4700, military: 60, wealth: 4200, flag: '🇸🇿', capital: 'Mbabane', language: 'Swati', continent: 'Afrique' },
  { id: 'kw', name: 'Koweït', area: '17 818 km²', areaKm2: 17818, population: 4300000, gdp: 160000, military: 8000, wealth: 37000, flag: '🇰🇼', capital: 'Koweït City', language: 'Arabe', continent: 'Asie' },
  { id: 'fj', name: 'Fidji', area: '18 272 km²', areaKm2: 18272, population: 930000, gdp: 5500, military: 60, wealth: 5900, flag: '🇫🇯', capital: 'Suva', language: 'Anglais', continent: 'Océanie' },
  { id: 'si', name: 'Slovénie', area: '20 273 km²', areaKm2: 20273, population: 2100000, gdp: 68000, military: 800, wealth: 32000, flag: '🇸🇮', capital: 'Ljubljana', language: 'Slovène', continent: 'Europe' },
  { id: 'il', name: 'Israël', area: '20 770 km²', areaKm2: 20770, population: 9700000, gdp: 525000, military: 24000, wealth: 54000, flag: '🇮🇱', capital: 'Jérusalem', language: 'Hébreu', continent: 'Asie' },
  { id: 'sv', name: 'Salvador', area: '21 041 km²', areaKm2: 21041, population: 6300000, gdp: 33000, military: 200, wealth: 5200, flag: '🇸🇻', capital: 'San Salvador', language: 'Espagnol', continent: 'Amérique' },
  { id: 'bz', name: 'Belize', area: '22 966 km²', areaKm2: 22966, population: 410000, gdp: 2200, military: 20, wealth: 5300, flag: '🇧🇿', capital: 'Belmopan', language: 'Anglais', continent: 'Amérique' },
  { id: 'dj', name: 'Djibouti', area: '23 200 km²', areaKm2: 23200, population: 1100000, gdp: 3900, military: 200, wealth: 3500, flag: '🇩🇯', capital: 'Djibouti', language: 'Arabe', continent: 'Afrique' },
  { id: 'mk', name: 'Macédoine du Nord', area: '25 713 km²', areaKm2: 25713, population: 1830000, gdp: 15000, military: 200, wealth: 8200, flag: '🇲🇰', capital: 'Skopje', language: 'Macédonien', continent: 'Europe' },
  { id: 'rw', name: 'Rwanda', area: '26 338 km²', areaKm2: 26338, population: 14000000, gdp: 13000, military: 200, wealth: 950, flag: '🇷🇼', capital: 'Kigali', language: 'Kinyarwanda', continent: 'Afrique' },
  { id: 'ht', name: 'Haïti', area: '27 750 km²', areaKm2: 27750, population: 11700000, gdp: 22000, military: 50, wealth: 1800, flag: '🇭🇹', capital: 'Port-au-Prince', language: 'Français', continent: 'Amérique' },
  { id: 'bi', name: 'Burundi', area: '27 834 km²', areaKm2: 27834, population: 13000000, gdp: 3000, military: 100, wealth: 230, flag: '🇧🇮', capital: 'Gitega', language: 'Kirundi', continent: 'Afrique' },
  { id: 'gq', name: 'Guinée équatoriale', area: '28 051 km²', areaKm2: 28051, population: 1700000, gdp: 11000, military: 200, wealth: 6500, flag: '🇬🇶', capital: 'Malabo', language: 'Espagnol', continent: 'Afrique' },
  { id: 'al', name: 'Albanie', area: '28 748 km²', areaKm2: 28748, population: 2800000, gdp: 23000, military: 250, wealth: 8100, flag: '🇦🇱', capital: 'Tirana', language: 'Albanais', continent: 'Europe' },
  { id: 'sb', name: 'Salomon', area: '28 896 km²', areaKm2: 28896, population: 740000, gdp: 1700, military: 10, wealth: 2300, flag: '🇸🇧', capital: 'Honiara', language: 'Anglais', continent: 'Océanie' },
  { id: 'am', name: 'Arménie', area: '29 743 km²', areaKm2: 29743, population: 2800000, gdp: 24000, military: 1000, wealth: 8500, flag: '🇦🇲', capital: 'Erevan', language: 'Arménien', continent: 'Asie' },
  { id: 'ls', name: 'Lesotho', area: '30 355 km²', areaKm2: 30355, population: 2300000, gdp: 2000, military: 30, wealth: 1000, flag: '🇱🇸', capital: 'Maseru', language: 'Sotho', continent: 'Afrique' },
  { id: 'be', name: 'Belgique', area: '30 528 km²', areaKm2: 30528, population: 11700000, gdp: 630000, military: 6000, wealth: 54000, flag: '🇧🇪', capital: 'Bruxelles', language: 'Néerlandais', continent: 'Europe' },
  { id: 'md', name: 'Moldavie', area: '33 846 km²', areaKm2: 33846, population: 2600000, gdp: 16000, military: 100, wealth: 6300, flag: '🇲🇩', capital: 'Chisinau', language: 'Roumain', continent: 'Europe' },
  { id: 'gw', name: 'Guinée-Bissau', area: '36 125 km²', areaKm2: 36125, population: 2100000, gdp: 1800, military: 30, wealth: 850, flag: '🇬🇼', capital: 'Bissau', language: 'Portugais', continent: 'Afrique' },
  { id: 'bt', name: 'Bhoutan', area: '38 394 km²', areaKm2: 38394, population: 780000, gdp: 2900, military: 40, wealth: 3800, flag: '🇧🇹', capital: 'Thimphou', language: 'Dzongkha', continent: 'Asie' },
  { id: 'ch', name: 'Suisse', area: '41 285 km²', areaKm2: 41285, population: 8800000, gdp: 880000, military: 6500, wealth: 100000, flag: '🇨🇭', capital: 'Berne', language: 'Allemand', continent: 'Europe' },
  { id: 'nl', name: 'Pays-Bas', area: '41 850 km²', areaKm2: 41850, population: 17800000, gdp: 1090000, military: 15000, wealth: 61000, flag: '🇳🇱', capital: 'Amsterdam', language: 'Néerlandais', continent: 'Europe' },
  { id: 'dk', name: 'Danemark', area: '42 933 km²', areaKm2: 42933, population: 5900000, gdp: 400000, military: 6000, wealth: 68000, flag: '🇩🇰', capital: 'Copenhague', language: 'Danois', continent: 'Europe' },
  { id: 'ee', name: 'Estonie', area: '45 227 km²', areaKm2: 45227, population: 1330000, gdp: 40000, military: 1000, wealth: 30000, flag: '🇪🇪', capital: 'Tallinn', language: 'Estonien', continent: 'Europe' },
  { id: 'do', name: 'République dominicaine', area: '48 671 km²', areaKm2: 48671, population: 11300000, gdp: 121000, military: 800, wealth: 10600, flag: '🇩🇴', capital: 'Saint-Domingue', language: 'Espagnol', continent: 'Amérique' },
  { id: 'sk', name: 'Slovaquie', area: '49 037 km²', areaKm2: 49037, population: 5450000, gdp: 130000, military: 2500, wealth: 24000, flag: '🇸🇰', capital: 'Bratislava', language: 'Slovaque', continent: 'Europe' },
  { id: 'cr', name: 'Costa Rica', area: '51 100 km²', areaKm2: 51100, population: 5200000, gdp: 76000, military: 0, wealth: 14600, flag: '🇨🇷', capital: 'San José', language: 'Espagnol', continent: 'Amérique' },
  { id: 'ba', name: 'Bosnie-Herzégovine', area: '51 197 km²', areaKm2: 51197, population: 3200000, gdp: 26000, military: 400, wealth: 8100, flag: '🇧🇦', capital: 'Sarajevo', language: 'Bosnien', continent: 'Europe' },
  { id: 'hr', name: 'Croatie', area: '56 594 km²', areaKm2: 56594, population: 3850000, gdp: 84000, military: 1300, wealth: 22000, flag: '🇭🇷', capital: 'Zagreb', language: 'Croate', continent: 'Europe' },
  { id: 'tg', name: 'Togo', area: '56 785 km²', areaKm2: 56785, population: 8600000, gdp: 8300, military: 150, wealth: 950, flag: '🇹🇬', capital: 'Lomé', language: 'Français', continent: 'Afrique' },
  { id: 'lv', name: 'Lettonie', area: '64 589 km²', areaKm2: 64589, population: 1850000, gdp: 44000, military: 900, wealth: 23800, flag: '🇱🇻', capital: 'Riga', language: 'Letton', continent: 'Europe' },
  { id: 'lt', name: 'Lituanie', area: '65 300 km²', areaKm2: 65300, population: 2800000, gdp: 78000, military: 1500, wealth: 27500, flag: '🇱🇹', capital: 'Vilnius', language: 'Lituanien', continent: 'Europe' },
  { id: 'lk', name: 'Sri Lanka', area: '65 610 km²', areaKm2: 65610, population: 22000000, gdp: 84000, military: 1600, wealth: 3800, flag: '🇱🇰', capital: 'Colombo', language: 'Cinghalais', continent: 'Asie' },
  { id: 'ge', name: 'Géorgie', area: '69 700 km²', areaKm2: 69700, population: 3700000, gdp: 30000, military: 900, wealth: 8100, flag: '🇬🇪', capital: 'Tbilissi', language: 'Géorgien', continent: 'Asie' },
  { id: 'ie', name: 'Irlande', area: '70 273 km²', areaKm2: 70273, population: 5100000, gdp: 545000, military: 1500, wealth: 103000, flag: '🇮🇪', capital: 'Dublin', language: 'Anglais', continent: 'Europe' },
  { id: 'sl', name: 'Sierra Leone', area: '71 740 km²', areaKm2: 71740, population: 8600000, gdp: 4200, military: 60, wealth: 480, flag: '🇸🇱', capital: 'Freetown', language: 'Anglais', continent: 'Afrique' },
  { id: 'pa', name: 'Panama', area: '75 417 km²', areaKm2: 75417, population: 4400000, gdp: 82000, military: 500, wealth: 18500, flag: '🇵🇦', capital: 'Panama', language: 'Espagnol', continent: 'Amérique' },
  { id: 'cz', name: 'Tchéquie', area: '78 871 km²', areaKm2: 78871, population: 10500000, gdp: 330000, military: 5000, wealth: 31000, flag: '🇨🇿', capital: 'Prague', language: 'Tchèque', continent: 'Europe' },
  { id: 'ae', name: 'Émirats arabes unis', area: '83 600 km²', areaKm2: 83600, population: 9500000, gdp: 507000, military: 23000, wealth: 53000, flag: '🇦🇪', capital: 'Abou Dabi', language: 'Arabe', continent: 'Asie' },
  { id: 'at', name: 'Autriche', area: '83 879 km²', areaKm2: 83879, population: 9100000, gdp: 520000, military: 4500, wealth: 57000, flag: '🇦🇹', capital: 'Vienne', language: 'Allemand', continent: 'Europe' },
  { id: 'az', name: 'Azerbaïdjan', area: '86 600 km²', areaKm2: 86600, population: 10300000, gdp: 78000, military: 2500, wealth: 7600, flag: '🇦🇿', capital: 'Bakou', language: 'Azéri', continent: 'Asie' },
  { id: 'rs', name: 'Serbie', area: '88 361 km²', areaKm2: 88361, population: 6600000, gdp: 76000, military: 1500, wealth: 11500, flag: '🇷🇸', capital: 'Belgrade', language: 'Serbe', continent: 'Europe' },
  { id: 'jo', name: 'Jordanie', area: '89 342 km²', areaKm2: 89342, population: 11300000, gdp: 50000, military: 2200, wealth: 4400, flag: '🇯🇴', capital: 'Amman', language: 'Arabe', continent: 'Asie' },
  { id: 'pt', name: 'Portugal', area: '92 212 km²', areaKm2: 92212, population: 10300000, gdp: 289000, military: 4300, wealth: 28000, flag: '🇵🇹', capital: 'Lisbonne', language: 'Portugais', continent: 'Europe' },
  { id: 'hu', name: 'Hongrie', area: '93 028 km²', areaKm2: 93028, population: 9600000, gdp: 210000, military: 4000, wealth: 22000, flag: '🇭🇺', capital: 'Budapest', language: 'Hongrois', continent: 'Europe' },
  { id: 'kr', name: 'Corée du Sud', area: '100 210 km²', areaKm2: 100210, population: 51700000, gdp: 1710000, military: 47000, wealth: 33000, flag: '🇰🇷', capital: 'Séoul', language: 'Coréen', continent: 'Asie' },
  { id: 'is', name: 'Islande', area: '103 000 km²', areaKm2: 103000, population: 380000, gdp: 31000, military: 0, wealth: 78000, flag: '🇮🇸', capital: 'Reykjavik', language: 'Islandais', continent: 'Europe' },
  { id: 'gt', name: 'Guatemala', area: '108 889 km²', areaKm2: 108889, population: 18000000, gdp: 100000, military: 400, wealth: 5500, flag: '🇬🇹', capital: 'Guatemala', language: 'Espagnol', continent: 'Amérique' },
  { id: 'cu', name: 'Cuba', area: '109 884 km²', areaKm2: 109884, population: 11000000, gdp: 107000, military: 1000, wealth: 9500, flag: '🇨🇺', capital: 'La Havane', language: 'Espagnol', continent: 'Amérique' },
  { id: 'bg', name: 'Bulgarie', area: '110 879 km²', areaKm2: 110879, population: 6800000, gdp: 100000, military: 1800, wealth: 14500, flag: '🇧🇬', capital: 'Sofia', language: 'Bulgare', continent: 'Europe' },
  { id: 'lr', name: 'Liberia', area: '111 369 km²', areaKm2: 111369, population: 5300000, gdp: 4400, military: 30, wealth: 800, flag: '🇱🇷', capital: 'Monrovia', language: 'Anglais', continent: 'Afrique' },
  { id: 'hn', name: 'Honduras', area: '112 492 km²', areaKm2: 112492, population: 10600000, gdp: 33000, military: 300, wealth: 3100, flag: '🇭🇳', capital: 'Tegucigalpa', language: 'Espagnol', continent: 'Amérique' },
  { id: 'bj', name: 'Bénin', area: '114 763 km²', areaKm2: 114763, population: 13000000, gdp: 19000, military: 200, wealth: 1400, flag: '🇧🇯', capital: 'Porto-Novo', language: 'Français', continent: 'Afrique' },
  { id: 'er', name: 'Érythrée', area: '117 600 km²', areaKm2: 117600, population: 3700000, gdp: 2500, military: 300, wealth: 700, flag: '🇪🇷', capital: 'Asmara', language: 'Tigrigna', continent: 'Afrique' },
  { id: 'mw', name: 'Malawi', area: '118 484 km²', areaKm2: 118484, population: 20000000, gdp: 13000, military: 60, wealth: 650, flag: '🇲🇼', capital: 'Lilongwe', language: 'Anglais', continent: 'Afrique' },
  { id: 'kp', name: 'Corée du Nord', area: '120 538 km²', areaKm2: 120538, population: 26000000, gdp: 18000, military: 4000, wealth: 700, flag: '🇰🇵', capital: 'Pyongyang', language: 'Coréen', continent: 'Asie' },
  { id: 'ni', name: 'Nicaragua', area: '130 373 km²', areaKm2: 130373, population: 6900000, gdp: 17000, military: 200, wealth: 2400, flag: '🇳🇮', capital: 'Managua', language: 'Espagnol', continent: 'Amérique' },
  { id: 'gr', name: 'Grèce', area: '131 957 km²', areaKm2: 131957, population: 10400000, gdp: 238000, military: 8000, wealth: 22900, flag: '🇬🇷', capital: 'Athènes', language: 'Grec', continent: 'Europe' },
  { id: 'tj', name: 'Tadjikistan', area: '143 100 km²', areaKm2: 143100, population: 10100000, gdp: 12000, military: 200, wealth: 1200, flag: '🇹🇯', capital: 'Douchanbé', language: 'Tadjik', continent: 'Asie' },
  { id: 'np', name: 'Népal', area: '147 516 km²', areaKm2: 147516, population: 30000000, gdp: 42000, military: 400, wealth: 1400, flag: '🇳🇵', capital: 'Katmandou', language: 'Népalais', continent: 'Asie' },
  { id: 'bd', name: 'Bangladesh', area: '148 460 km²', areaKm2: 148460, population: 173000000, gdp: 460000, military: 5000, wealth: 2700, flag: '🇧🇩', capital: 'Dacca', language: 'Bengali', continent: 'Asie' },
  { id: 'tn', name: 'Tunisie', area: '163 610 km²', areaKm2: 163610, population: 12100000, gdp: 48000, military: 1300, wealth: 4000, flag: '🇹🇳', capital: 'Tunis', language: 'Arabe', continent: 'Afrique' },
  { id: 'sr', name: 'Suriname', area: '163 820 km²', areaKm2: 163820, population: 620000, gdp: 3800, military: 100, wealth: 6300, flag: '🇸🇷', capital: 'Paramaribo', language: 'Néerlandais', continent: 'Amérique' },
  { id: 'uy', name: 'Uruguay', area: '176 215 km²', areaKm2: 176215, population: 3400000, gdp: 77000, military: 1300, wealth: 22500, flag: '🇺🇾', capital: 'Montevideo', language: 'Espagnol', continent: 'Amérique' },
  { id: 'kh', name: 'Cambodge', area: '181 035 km²', areaKm2: 181035, population: 17000000, gdp: 30000, military: 700, wealth: 1800, flag: '🇰🇭', capital: 'Phnom Penh', language: 'Khmer', continent: 'Asie' },
  { id: 'sy', name: 'Syrie', area: '185 180 km²', areaKm2: 185180, population: 23000000, gdp: 9000, military: 1500, wealth: 400, flag: '🇸🇾', capital: 'Damas', language: 'Arabe', continent: 'Asie' },
  { id: 'sn', name: 'Sénégal', area: '196 722 km²', areaKm2: 196722, population: 18000000, gdp: 32000, military: 500, wealth: 1700, flag: '🇸🇳', capital: 'Dakar', language: 'Français', continent: 'Afrique' },
  { id: 'kg', name: 'Kirghizistan', area: '199 951 km²', areaKm2: 199951, population: 7000000, gdp: 13000, military: 300, wealth: 1900, flag: '🇰🇬', capital: 'Bichkek', language: 'Kirghize', continent: 'Asie' },
  { id: 'gy', name: 'Guyana', area: '214 969 km²', areaKm2: 214969, population: 810000, gdp: 21000, military: 100, wealth: 26000, flag: '🇬🇾', capital: 'Georgetown', language: 'Anglais', continent: 'Amérique' },
  { id: 'la', name: 'Laos', area: '236 800 km²', areaKm2: 236800, population: 7600000, gdp: 15000, military: 200, wealth: 2000, flag: '🇱🇦', capital: 'Vientiane', language: 'Lao', continent: 'Asie' },
  { id: 'ro', name: 'Roumanie', area: '238 391 km²', areaKm2: 238391, population: 19000000, gdp: 350000, military: 8000, wealth: 18500, flag: '🇷🇴', capital: 'Bucarest', language: 'Roumain', continent: 'Europe' },
  { id: 'gh', name: 'Ghana', area: '238 533 km²', areaKm2: 238533, population: 33000000, gdp: 76000, military: 400, wealth: 2400, flag: '🇬🇭', capital: 'Accra', language: 'Anglais', continent: 'Afrique' },
  { id: 'ug', name: 'Ouganda', area: '241 550 km²', areaKm2: 241550, population: 48000000, gdp: 48000, military: 500, wealth: 1000, flag: '🇺🇬', capital: 'Kampala', language: 'Anglais', continent: 'Afrique' },
  { id: 'gb', name: 'Royaume-Uni', area: '243 610 km²', areaKm2: 243610, population: 68000000, gdp: 3340000, military: 74000, wealth: 49000, flag: '🇬🇧', capital: 'Londres', language: 'Anglais', continent: 'Europe' },
  { id: 'gn', name: 'Guinée', area: '245 857 km²', areaKm2: 245857, population: 14000000, gdp: 21000, military: 200, wealth: 1500, flag: '🇬🇳', capital: 'Conakry', language: 'Français', continent: 'Afrique' },
  { id: 'ga', name: 'Gabon', area: '267 668 km²', areaKm2: 267668, population: 2400000, gdp: 19000, military: 300, wealth: 8100, flag: '🇬🇦', capital: 'Libreville', language: 'Français', continent: 'Afrique' },
  { id: 'nz', name: 'Nouvelle-Zélande', area: '268 021 km²', areaKm2: 268021, population: 5200000, gdp: 253000, military: 3000, wealth: 48600, flag: '🇳🇿', capital: 'Wellington', language: 'Anglais', continent: 'Océanie' },
  { id: 'bf', name: 'Burkina Faso', area: '272 967 km²', areaKm2: 272967, population: 23000000, gdp: 21000, military: 500, wealth: 900, flag: '🇧🇫', capital: 'Ouagadougou', language: 'Français', continent: 'Afrique' },
  { id: 'ec', name: 'Équateur', area: '283 561 km²', areaKm2: 283561, population: 18000000, gdp: 118000, military: 2500, wealth: 6500, flag: '🇪🇨', capital: 'Quito', language: 'Espagnol', continent: 'Amérique' },
  { id: 'ph', name: 'Philippines', area: '300 000 km²', areaKm2: 300000, population: 117000000, gdp: 470000, military: 6000, wealth: 4000, flag: '🇵🇭', capital: 'Manille', language: 'Filipino', continent: 'Asie' },
  { id: 'it', name: 'Italie', area: '301 340 km²', areaKm2: 301340, population: 59000000, gdp: 2190000, military: 33000, wealth: 37000, flag: '🇮🇹', capital: 'Rome', language: 'Italien', continent: 'Europe' },
  { id: 'om', name: 'Oman', area: '309 500 km²', areaKm2: 309500, population: 4600000, gdp: 108000, military: 8000, wealth: 23300, flag: '🇴🇲', capital: 'Mascate', language: 'Arabe', continent: 'Asie' },
  { id: 'pl', name: 'Pologne', area: '312 696 km²', areaKm2: 312696, population: 37700000, gdp: 810000, military: 30000, wealth: 21500, flag: '🇵🇱', capital: 'Varsovie', language: 'Polonais', continent: 'Europe' },
  { id: 'ci', name: 'Côte d\'Ivoire', area: '322 463 km²', areaKm2: 322463, population: 29000000, gdp: 78000, military: 600, wealth: 2700, flag: '🇨🇮', capital: 'Yamoussoukro', language: 'Français', continent: 'Afrique' },
  { id: 'my', name: 'Malaisie', area: '330 803 km²', areaKm2: 330803, population: 33900000, gdp: 400000, military: 4500, wealth: 11800, flag: '🇲🇾', capital: 'Kuala Lumpur', language: 'Malais', continent: 'Asie' },
  { id: 'vn', name: 'Vietnam', area: '331 212 km²', areaKm2: 331212, population: 99000000, gdp: 430000, military: 7000, wealth: 4300, flag: '🇻🇳', capital: 'Hanoï', language: 'Vietnamien', continent: 'Asie' },
  { id: 'fi', name: 'Finlande', area: '338 424 km²', areaKm2: 338424, population: 5550000, gdp: 300000, military: 6000, wealth: 54000, flag: '🇫🇮', capital: 'Helsinki', language: 'Finnois', continent: 'Europe' },
  { id: 'cg', name: 'République du Congo', area: '342 000 km²', areaKm2: 342000, population: 6100000, gdp: 15000, military: 200, wealth: 2400, flag: '🇨🇬', capital: 'Brazzaville', language: 'Français', continent: 'Afrique' },
  { id: 'de', name: 'Allemagne', area: '357 588 km²', areaKm2: 357588, population: 84000000, gdp: 4460000, military: 68000, wealth: 53000, flag: '🇩🇪', capital: 'Berlin', language: 'Allemand', continent: 'Europe' },
  { id: 'jp', name: 'Japon', area: '377 975 km²', areaKm2: 377975, population: 123000000, gdp: 4200000, military: 50000, wealth: 33900, flag: '🇯🇵', capital: 'Tokyo', language: 'Japonais', continent: 'Asie' },
  { id: 'no', name: 'Norvège', area: '385 207 km²', areaKm2: 385207, population: 5500000, gdp: 480000, military: 9000, wealth: 87000, flag: '🇳🇴', capital: 'Oslo', language: 'Norvégien', continent: 'Europe' },
  { id: 'zw', name: 'Zimbabwe', area: '390 757 km²', areaKm2: 390757, population: 16000000, gdp: 32000, military: 300, wealth: 1900, flag: '🇿🇼', capital: 'Harare', language: 'Anglais', continent: 'Afrique' },
  { id: 'py', name: 'Paraguay', area: '406 752 km²', areaKm2: 406752, population: 6800000, gdp: 42000, military: 300, wealth: 6100, flag: '🇵🇾', capital: 'Asuncion', language: 'Espagnol', continent: 'Amérique' },
  { id: 'iq', name: 'Irak', area: '438 317 km²', areaKm2: 438317, population: 44000000, gdp: 260000, military: 5000, wealth: 5900, flag: '🇮🇶', capital: 'Bagdad', language: 'Arabe', continent: 'Asie' },
  { id: 'ma', name: 'Maroc', area: '446 550 km²', areaKm2: 446550, population: 37500000, gdp: 145000, military: 5500, wealth: 3900, flag: '🇲🇦', capital: 'Rabat', language: 'Arabe', continent: 'Afrique' },
  { id: 'uz', name: 'Ouzbékistan', area: '447 400 km²', areaKm2: 447400, population: 35600000, gdp: 90000, military: 2200, wealth: 2500, flag: '🇺🇿', capital: 'Tachkent', language: 'Ouzbek', continent: 'Asie' },
  { id: 'se', name: 'Suède', area: '450 295 km²', areaKm2: 450295, population: 10500000, gdp: 590000, military: 8500, wealth: 56000, flag: '🇸🇪', capital: 'Stockholm', language: 'Suédois', continent: 'Europe' },
  { id: 'pg', name: 'Papouasie-Nouvelle-Guinée', area: '462 840 km²', areaKm2: 462840, population: 10500000, gdp: 31000, military: 100, wealth: 3000, flag: '🇵🇬', capital: 'Port Moresby', language: 'Anglais', continent: 'Océanie' },
  { id: 'cm', name: 'Cameroun', area: '475 442 km²', areaKm2: 475442, population: 28600000, gdp: 47000, military: 400, wealth: 1700, flag: '🇨🇲', capital: 'Yaoundé', language: 'Français', continent: 'Afrique' },
  { id: 'tm', name: 'Turkménistan', area: '488 100 km²', areaKm2: 488100, population: 6400000, gdp: 60000, military: 2000, wealth: 9400, flag: '🇹🇲', capital: 'Achgabat', language: 'Turkmène', continent: 'Asie' },
  { id: 'es', name: 'Espagne', area: '505 990 km²', areaKm2: 505990, population: 47500000, gdp: 1580000, military: 21000, wealth: 33000, flag: '🇪🇸', capital: 'Madrid', language: 'Espagnol', continent: 'Europe' },
  { id: 'th', name: 'Thaïlande', area: '513 120 km²', areaKm2: 513120, population: 71000000, gdp: 515000, military: 5900, wealth: 7200, flag: '🇹🇭', capital: 'Bangkok', language: 'Thaï', continent: 'Asie' },
  { id: 'ye', name: 'Yémen', area: '527 968 km²', areaKm2: 527968, population: 34000000, gdp: 21000, military: 2000, wealth: 650, flag: '🇾🇪', capital: 'Sanaa', language: 'Arabe', continent: 'Asie' },
  { id: 'fr', name: 'France', area: '551 695 km²', areaKm2: 551695, population: 68000000, gdp: 3030000, military: 61000, wealth: 44500, flag: '🇫🇷', capital: 'Paris', language: 'Français', continent: 'Europe' },
  { id: 'ke', name: 'Kenya', area: '580 367 km²', areaKm2: 580367, population: 55000000, gdp: 118000, military: 1200, wealth: 2100, flag: '🇰🇪', capital: 'Nairobi', language: 'Swahili', continent: 'Afrique' },
  { id: 'bw', name: 'Botswana', area: '581 730 km²', areaKm2: 581730, population: 2500000, gdp: 20000, military: 500, wealth: 7900, flag: '🇧🇼', capital: 'Gaborone', language: 'Anglais', continent: 'Afrique' },
  { id: 'mg', name: 'Madagascar', area: '587 041 km²', areaKm2: 587041, population: 30000000, gdp: 16000, military: 100, wealth: 550, flag: '🇲🇬', capital: 'Antananarivo', language: 'Malgache', continent: 'Afrique' },
  { id: 'ua', name: 'Ukraine', area: '603 550 km²', areaKm2: 603550, population: 36000000, gdp: 178000, military: 64000, wealth: 5000, flag: '🇺🇦', capital: 'Kiev', language: 'Ukrainien', continent: 'Europe' },
  { id: 'ss', name: 'Soudan du Sud', area: '619 745 km²', areaKm2: 619745, population: 11000000, gdp: 6000, military: 500, wealth: 550, flag: '🇸🇸', capital: 'Djouba', language: 'Anglais', continent: 'Afrique' },
  { id: 'cf', name: 'République centrafricaine', area: '622 984 km²', areaKm2: 622984, population: 5600000, gdp: 2500, military: 100, wealth: 450, flag: '🇨🇫', capital: 'Bangui', language: 'Français', continent: 'Afrique' },
  { id: 'so', name: 'Somalie', area: '637 657 km²', areaKm2: 637657, population: 18000000, gdp: 10000, military: 200, wealth: 550, flag: '🇸🇴', capital: 'Mogadiscio', language: 'Somali', continent: 'Afrique' },
  { id: 'af', name: 'Afghanistan', area: '652 230 km²', areaKm2: 652230, population: 42000000, gdp: 15000, military: 400, wealth: 400, flag: '🇦🇫', capital: 'Kaboul', language: 'Pachtoune', continent: 'Asie' },
  { id: 'mm', name: 'Myanmar', area: '676 578 km²', areaKm2: 676578, population: 54000000, gdp: 65000, military: 2800, wealth: 1200, flag: '🇲🇲', capital: 'Naypyidaw', language: 'Birman', continent: 'Asie' },
  { id: 'zm', name: 'Zambie', area: '752 618 km²', areaKm2: 752618, population: 20000000, gdp: 29000, military: 400, wealth: 1400, flag: '🇿🇲', capital: 'Lusaka', language: 'Anglais', continent: 'Afrique' },
  { id: 'cl', name: 'Chili', area: '756 102 km²', areaKm2: 756102, population: 19600000, gdp: 335000, military: 6000, wealth: 17000, flag: '🇨🇱', capital: 'Santiago', language: 'Espagnol', continent: 'Amérique' },
  { id: 'tr', name: 'Turquie', area: '783 562 km²', areaKm2: 783562, population: 85000000, gdp: 1110000, military: 40000, wealth: 13000, flag: '🇹🇷', capital: 'Ankara', language: 'Turc', continent: 'Asie' },
  { id: 'mz', name: 'Mozambique', area: '799 380 km²', areaKm2: 799380, population: 33000000, gdp: 21000, military: 200, wealth: 550, flag: '🇲🇿', capital: 'Maputo', language: 'Portugais', continent: 'Afrique' },
  { id: 'na', name: 'Namibie', area: '825 615 km²', areaKm2: 825615, population: 2600000, gdp: 12500, military: 250, wealth: 4800, flag: '🇳🇦', capital: 'Windhoek', language: 'Anglais', continent: 'Afrique' },
  { id: 'pk', name: 'Pakistan', area: '881 913 km²', areaKm2: 881913, population: 241000000, gdp: 375000, military: 10000, wealth: 1600, flag: '🇵🇰', capital: 'Islamabad', language: 'Ourdou', continent: 'Asie' },
  { id: 've', name: 'Venezuela', area: '916 445 km²', areaKm2: 916445, population: 28000000, gdp: 96000, military: 1500, wealth: 3400, flag: '🇻🇪', capital: 'Caracas', language: 'Espagnol', continent: 'Amérique' },
  { id: 'ng', name: 'Nigeria', area: '923 768 km²', areaKm2: 923768, population: 223000000, gdp: 390000, military: 3200, wealth: 2200, flag: '🇳🇬', capital: 'Abuja', language: 'Anglais', continent: 'Afrique' },
  { id: 'tz', name: 'Tanzanie', area: '947 303 km²', areaKm2: 947303, population: 67000000, gdp: 79000, military: 400, wealth: 1200, flag: '🇹🇿', capital: 'Dodoma', language: 'Swahili', continent: 'Afrique' },
  { id: 'eg', name: 'Égypte', area: '1 002 450 km²', areaKm2: 1002450, population: 112000000, gdp: 380000, military: 4500, wealth: 3500, flag: '🇪🇬', capital: 'Le Caire', language: 'Arabe', continent: 'Afrique' },
  { id: 'mr', name: 'Mauritanie', area: '1 030 700 km²', areaKm2: 1030700, population: 4900000, gdp: 11000, military: 200, wealth: 2100, flag: '🇲🇷', capital: 'Nouakchott', language: 'Arabe', continent: 'Afrique' },
  { id: 'bo', name: 'Bolivie', area: '1 098 581 km²', areaKm2: 1098581, population: 12000000, gdp: 46000, military: 500, wealth: 3700, flag: '🇧🇴', capital: 'Sucre', language: 'Espagnol', continent: 'Amérique' },
  { id: 'et', name: 'Éthiopie', area: '1 104 300 km²', areaKm2: 1104300, population: 128000000, gdp: 156000, military: 500, wealth: 1200, flag: '🇪🇹', capital: 'Addis-Abeba', language: 'Amharique', continent: 'Afrique' },
  { id: 'co', name: 'Colombie', area: '1 141 748 km²', areaKm2: 1141748, population: 52000000, gdp: 365000, military: 11000, wealth: 6900, flag: '🇨🇴', capital: 'Bogota', language: 'Espagnol', continent: 'Amérique' },
  { id: 'za', name: 'Afrique du Sud', area: '1 221 037 km²', areaKm2: 1221037, population: 60000000, gdp: 400000, military: 3500, wealth: 6700, flag: '🇿🇦', capital: 'Pretoria', language: 'Anglais', continent: 'Afrique' },
  { id: 'ml', name: 'Mali', area: '1 240 192 km²', areaKm2: 1240192, population: 23000000, gdp: 20000, military: 500, wealth: 900, flag: '🇲🇱', capital: 'Bamako', language: 'Français', continent: 'Afrique' },
  { id: 'ao', name: 'Angola', area: '1 246 700 km²', areaKm2: 1246700, population: 36000000, gdp: 105000, military: 2000, wealth: 2900, flag: '🇦🇴', capital: 'Luanda', language: 'Portugais', continent: 'Afrique' },
  { id: 'ne', name: 'Niger', area: '1 267 000 km²', areaKm2: 1267000, population: 26000000, gdp: 16000, military: 300, wealth: 600, flag: '🇳🇪', capital: 'Niamey', language: 'Français', continent: 'Afrique' },
  { id: 'td', name: 'Tchad', area: '1 284 000 km²', areaKm2: 1284000, population: 18000000, gdp: 13000, military: 400, wealth: 700, flag: '🇹🇩', capital: 'N\'Djaména', language: 'Français', continent: 'Afrique' },
  { id: 'pe', name: 'Pérou', area: '1 285 216 km²', areaKm2: 1285216, population: 34000000, gdp: 267000, military: 3000, wealth: 7800, flag: '🇵🇪', capital: 'Lima', language: 'Espagnol', continent: 'Amérique' },
  { id: 'mn', name: 'Mongolie', area: '1 564 110 km²', areaKm2: 1564110, population: 3400000, gdp: 19000, military: 300, wealth: 5600, flag: '🇲🇳', capital: 'Oulan-Bator', language: 'Mongol', continent: 'Asie' },
  { id: 'ir', name: 'Iran', area: '1 648 195 km²', areaKm2: 1648195, population: 89000000, gdp: 405000, military: 10000, wealth: 4500, flag: '🇮🇷', capital: 'Téhéran', language: 'Persan', continent: 'Asie' },
  { id: 'ly', name: 'Libye', area: '1 759 540 km²', areaKm2: 1759540, population: 6900000, gdp: 45000, military: 3000, wealth: 6500, flag: '🇱🇾', capital: 'Tripoli', language: 'Arabe', continent: 'Afrique' },
  { id: 'sd', name: 'Soudan', area: '1 861 484 km²', areaKm2: 1861484, population: 48000000, gdp: 34000, military: 3000, wealth: 700, flag: '🇸🇩', capital: 'Khartoum', language: 'Arabe', continent: 'Afrique' },
  { id: 'id', name: 'Indonésie', area: '1 904 569 km²', areaKm2: 1904569, population: 279000000, gdp: 1370000, military: 9000, wealth: 4900, flag: '🇮🇩', capital: 'Jakarta', language: 'Indonésien', continent: 'Asie' },
  { id: 'mx', name: 'Mexique', area: '1 964 375 km²', areaKm2: 1964375, population: 128000000, gdp: 1790000, military: 8500, wealth: 13800, flag: '🇲🇽', capital: 'Mexico', language: 'Espagnol', continent: 'Amérique' },
  { id: 'sa', name: 'Arabie saoudite', area: '2 149 690 km²', areaKm2: 2149690, population: 36000000, gdp: 1070000, military: 78000, wealth: 29800, flag: '🇸🇦', capital: 'Riyad', language: 'Arabe', continent: 'Asie' },
  { id: 'cd', name: 'Rép. dém. du Congo', area: '2 344 858 km²', areaKm2: 2344858, population: 102000000, gdp: 68000, military: 500, wealth: 650, flag: '🇨🇩', capital: 'Kinshasa', language: 'Français', continent: 'Afrique' },
  { id: 'dz', name: 'Algérie', area: '2 381 741 km²', areaKm2: 2381741, population: 45000000, gdp: 260000, military: 23000, wealth: 5700, flag: '🇩🇿', capital: 'Alger', language: 'Arabe', continent: 'Afrique' },
  { id: 'kz', name: 'Kazakhstan', area: '2 724 900 km²', areaKm2: 2724900, population: 19800000, gdp: 260000, military: 3000, wealth: 13100, flag: '🇰🇿', capital: 'Astana', language: 'Kazakh', continent: 'Asie' },
  { id: 'ar', name: 'Argentine', area: '2 780 400 km²', areaKm2: 2780400, population: 46000000, gdp: 640000, military: 3000, wealth: 13700, flag: '🇦🇷', capital: 'Buenos Aires', language: 'Espagnol', continent: 'Amérique' },
  { id: 'in', name: 'Inde', area: '3 287 263 km²', areaKm2: 3287263, population: 1428000000, gdp: 3730000, military: 83000, wealth: 2600, flag: '🇮🇳', capital: 'New Delhi', language: 'Hindi', continent: 'Asie' },
  { id: 'au', name: 'Australie', area: '7 692 024 km²', areaKm2: 7692024, population: 26000000, gdp: 1690000, military: 32000, wealth: 65000, flag: '🇦🇺', capital: 'Canberra', language: 'Anglais', continent: 'Océanie' },
  { id: 'br', name: 'Brésil', area: '8 515 767 km²', areaKm2: 8515767, population: 216000000, gdp: 2170000, military: 22000, wealth: 10000, flag: '🇧🇷', capital: 'Brasília', language: 'Portugais', continent: 'Amérique' },
  { id: 'cn', name: 'Chine', area: '9 596 961 km²', areaKm2: 9596961, population: 1410000000, gdp: 17700000, military: 296000, wealth: 12600, flag: '🇨🇳', capital: 'Pékin', language: 'Mandarin', continent: 'Asie' },
  { id: 'us', name: 'États-Unis', area: '9 833 517 km²', areaKm2: 9833517, population: 335000000, gdp: 27000000, military: 880000, wealth: 82000, flag: '🇺🇸', capital: 'Washington', language: 'Anglais', continent: 'Amérique' },
  { id: 'ca', name: 'Canada', area: '9 984 670 km²', areaKm2: 9984670, population: 39000000, gdp: 2140000, military: 27000, wealth: 53000, flag: '🇨🇦', capital: 'Ottawa', language: 'Anglais', continent: 'Amérique' },
  { id: 'ru', name: 'Russie', area: '17 098 242 km²', areaKm2: 17098242, population: 144000000, gdp: 2100000, military: 109000, wealth: 14500, flag: '🇷🇺', capital: 'Moscou', language: 'Russe', continent: 'Europe' },
];

const SCORE_INCREMENT = 10;
const QUIZ_BONUS = 20;
const QUIZ_COOLDOWN_MS = 6000;
const QUIZ_RESULT_AUTO_CLOSE_MS = 1800;

// Sauvegarde locale : scores indexés par id de pays (plus par position dans
// COUNTRIES, puisque l'ordre de déblocage est désormais choisi par le joueur
// et non fixe), la liste des pays débloqués dans leur ordre de déblocage, et
// le choix en cours s'il y en a un (pour ne pas le perdre en cas de fermeture
// de l'app pendant qu'une proposition est affichée). v2 car le format diffère
// du tableau simple de v1 : une sauvegarde v1 est ignorée (nouvelle partie)
// plutôt que migrée, la mécanique de progression ayant changé. Toute erreur
// de lecture/écriture est avalée : le jeu doit rester jouable même si le
// stockage échoue (voir loadGameState/saveGameState).
const STORAGE_KEY = 'conquer-the-world:state:v2';
const COUNTRY_IDS = new Set(COUNTRIES.map((c) => c.id));
const STARTING_COUNTRY_ID = COUNTRIES[0].id;

function getDefaultGameState() {
  return {
    scores: { [STARTING_COUNTRY_ID]: 0 },
    unlockedIds: [STARTING_COUNTRY_ID],
    pendingChoice: null,
  };
}

function isValidGameState(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  const { scores, unlockedIds, pendingChoice } = parsed;
  if (!scores || typeof scores !== 'object') return false;
  if (!Array.isArray(unlockedIds) || unlockedIds.length === 0) return false;
  if (!unlockedIds.every((id) => COUNTRY_IDS.has(id))) return false;
  if (!Object.entries(scores).every(([id, value]) => COUNTRY_IDS.has(id) && typeof value === 'number')) {
    return false;
  }
  if (pendingChoice !== null) {
    if (!pendingChoice || !COUNTRY_IDS.has(pendingChoice.sourceId) || !Array.isArray(pendingChoice.optionIds)) {
      return false;
    }
    if (!pendingChoice.optionIds.every((id) => COUNTRY_IDS.has(id) && !unlockedIds.includes(id))) {
      return false;
    }
  }
  return true;
}

async function loadGameState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultGameState();
    const parsed = JSON.parse(raw);
    if (!isValidGameState(parsed)) return getDefaultGameState();
    return parsed;
  } catch (error) {
    return getDefaultGameState();
  }
}

async function saveGameState(state) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Stockage indisponible (quota, plateforme...) : on continue sans
    // sauvegarder plutôt que de planter le jeu.
  }
}

async function clearGameState() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // idem : on ignore, la réinitialisation en mémoire a déjà eu lieu.
  }
}

// Critères de score : chacun a un poids et une valeur de référence (le maximum
// réaliste au niveau mondial, pas seulement dans la liste actuelle) afin que
// les seuils restent stables si la liste s'étend vers les ~195 pays. Poids
// égaux (0.2 chacun, somme à 1) pour qu'aucun critère ne domine à lui seul :
// les micro-États s'en sortent via leur richesse par habitant, les grandes
// puissances via superficie/population/PIB/armée. Pour ajouter un critère
// plus tard, il suffit d'ajouter une entrée ici et un champ correspondant sur
// chaque pays.
const SCORE_CRITERIA = [
  { key: 'areaKm2', label: 'Superficie', weight: 0.2, maxValue: 17098242 }, // superficie de la Russie
  { key: 'population', label: 'Population', weight: 0.2, maxValue: 1450000000 }, // ~ Inde/Chine
  { key: 'gdp', label: 'PIB', weight: 0.2, maxValue: 27000000 }, // PIB nominal des États-Unis, en millions de dollars
  { key: 'military', label: 'Budget militaire', weight: 0.2, maxValue: 880000 }, // budget militaire des États-Unis, en millions de dollars
  { key: 'wealth', label: 'Richesse (PIB/habitant)', weight: 0.2, maxValue: 240000 }, // PIB/habitant le plus élevé au monde, en dollars
];

const MIN_UNLOCK_THRESHOLD = 50;
// Recalibré (300 → 450) : avec 5 critères au lieu de 2, l'indice de taille de
// chaque pays est plus dilué (aucun pays ne s'approche plus de 1), donc sans
// ajustement les seuils auraient tous baissé. 450 ramène le seuil du pays le
// plus « grand » (Chine) à ~280, comme avant l'ajout du PIB/armée/richesse.
const UNLOCK_THRESHOLD_RANGE = 450;

// Types de questions de quiz. Pour ajouter un type, il suffit d'ajouter une
// entrée ici : { key, buildPrompt, getCorrectAnswer, getDistractorValues,
// isEmoji }. getDistractorValues reçoit tous les pays pour piocher les
// mauvaises réponses parmi leurs valeurs pour ce même critère.
const QUIZ_QUESTION_TYPES = [
  {
    key: 'capital',
    buildPrompt: (country) => `Quelle est la capitale de ${country.name} ?`,
    getCorrectAnswer: (country) => country.capital,
    getDistractorValues: (country, allCountries) =>
      allCountries.filter((c) => c.id !== country.id).map((c) => c.capital),
    isEmoji: false,
  },
  {
    key: 'flag',
    buildPrompt: (country) => `Quel drapeau correspond à ${country.name} ?`,
    getCorrectAnswer: (country) => country.flag,
    getDistractorValues: (country, allCountries) =>
      allCountries.filter((c) => c.id !== country.id).map((c) => c.flag),
    isEmoji: true,
  },
  {
    key: 'language',
    buildPrompt: (country) => `Quelle est la langue officielle de ${country.name} ?`,
    getCorrectAnswer: (country) => country.language,
    getDistractorValues: (country, allCountries) =>
      allCountries.filter((c) => c.id !== country.id).map((c) => c.language),
    isEmoji: false,
  },
  {
    key: 'continent',
    buildPrompt: (country) => `Sur quel continent se trouve ${country.name} ?`,
    getCorrectAnswer: (country) => country.continent,
    getDistractorValues: (country, allCountries) =>
      allCountries.filter((c) => c.id !== country.id).map((c) => c.continent),
    isEmoji: false,
  },
  {
    key: 'gdp',
    buildPrompt: (country) => `Quel est approximativement le PIB de ${country.name} ?`,
    getCorrectAnswer: (country) => formatMoneyMillions(country.gdp),
    getDistractorValues: (country, allCountries) =>
      allCountries.filter((c) => c.id !== country.id).map((c) => formatMoneyMillions(c.gdp)),
    isEmoji: false,
  },
  {
    key: 'military',
    buildPrompt: (country) => `Quel est approximativement le budget militaire de ${country.name} ?`,
    getCorrectAnswer: (country) => formatMoneyMillions(country.military),
    getDistractorValues: (country, allCountries) =>
      allCountries.filter((c) => c.id !== country.id).map((c) => formatMoneyMillions(c.military)),
    isEmoji: false,
  },
];

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildQuizQuestion(country, allCountries) {
  const type = QUIZ_QUESTION_TYPES[Math.floor(Math.random() * QUIZ_QUESTION_TYPES.length)];
  const correctAnswer = type.getCorrectAnswer(country);
  const distractorPool = [...new Set(type.getDistractorValues(country, allCountries))].filter(
    (value) => value !== correctAnswer
  );
  const distractors = shuffle(distractorPool).slice(0, 3);
  return {
    typeKey: type.key,
    prompt: type.buildPrompt(country),
    correctAnswer,
    options: shuffle([correctAnswer, ...distractors]),
    isEmoji: type.isEmoji,
  };
}

function formatNumber(value) {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// gdp et military sont stockés en millions de dollars (voir COUNTRIES) pour
// éviter des nombres à 14 chiffres sur des cartes étroites.
function formatMoneyMillions(valueMillions) {
  return `${formatNumber(valueMillions)} M$`;
}

function formatWealthPerCapita(value) {
  return `${formatNumber(value)} $/hab.`;
}

// « Taille » normalisée d'un pays (0 à ~1) combinant tous les critères de
// SCORE_CRITERIA selon leur poids respectif.
function getSizeIndex(country) {
  return SCORE_CRITERIA.reduce(
    (total, criterion) => total + criterion.weight * (country[criterion.key] / criterion.maxValue),
    0
  );
}

// Le seuil qui déclenche le choix du pays suivant est calibré sur la taille
// réelle (superficie + population) du pays courant plutôt que sur sa seule
// position dans la liste, arrondi au multiple de 10 le plus proche (clics de
// 10 pts).
function getUnlockThreshold(country) {
  const sizeIndex = getSizeIndex(country);
  return Math.round((MIN_UNLOCK_THRESHOLD + sizeIndex * UNLOCK_THRESHOLD_RANGE) / 10) * 10;
}

// Répartit le score courant entre les critères, proportionnellement à la
// part de chacun dans la taille normalisée du pays.
function getContributions(country, score) {
  const sizeIndex = getSizeIndex(country);
  let remaining = score;
  const contributions = SCORE_CRITERIA.map((criterion, i) => {
    const share = sizeIndex > 0 ? (criterion.weight * (country[criterion.key] / criterion.maxValue)) / sizeIndex : 1 / SCORE_CRITERIA.length;
    const isLast = i === SCORE_CRITERIA.length - 1;
    const value = isLast ? remaining : Math.round(score * share);
    remaining -= value;
    return { ...criterion, value };
  });
  return contributions;
}

const CHOICE_OPTIONS_COUNT = 3;
// Relevé de 6 à 12 pour le passage à ~195 pays : sur un pool bien plus large,
// se limiter aux 6 plus proches en taille rendrait les propositions presque
// toujours identiques d'une partie à l'autre. 12 garde le tirage centré sur
// des pays de difficulté proche (pas un tirage au hasard sur toute la liste)
// tout en offrant assez de variété.
const CHOICE_CANDIDATE_POOL_SIZE = 12;

// Tire les pays proposés au joueur quand un pays atteint son seuil : parmi
// les pays encore verrouillés, on retient ceux dont la taille (superficie +
// population + PIB + armée + richesse normalisées) est la plus proche de
// celle du pays qui vient d'être développé, puis on en tire 3 au hasard dans
// ce sous-groupe pour garder un peu de variété d'une partie à l'autre.
function pickChoiceCandidates(sourceCountry, lockedCountries) {
  if (lockedCountries.length === 0) return [];
  const sourceSize = getSizeIndex(sourceCountry);
  const closest = [...lockedCountries]
    .sort((a, b) => Math.abs(getSizeIndex(a) - sourceSize) - Math.abs(getSizeIndex(b) - sourceSize))
    .slice(0, Math.min(CHOICE_CANDIDATE_POOL_SIZE, lockedCountries.length));
  return shuffle(closest).slice(0, Math.min(CHOICE_OPTIONS_COUNT, closest.length));
}

function getScoreColor(score, threshold) {
  const ratio = Math.min(score, threshold) / threshold;
  if (ratio >= 0.7) return COLORS.success;
  if (ratio >= 0.3) return COLORS.gold;
  return COLORS.muted;
}

// Carte du monde en projection équirectangulaire simplifiée (viewBox
// 1000x500 : x = longitude, y = latitude). Contours de continents
// approximatifs mais reconnaissables, tracés à la main (pas de fichier
// externe téléchargé). L'Antarctique est omise pour rester discrète.
function project(lon, lat) {
  return [((lon + 180) / 360) * 1000, ((90 - lat) / 180) * 500];
}

function buildPath(points) {
  const [start, ...rest] = points.map(([lon, lat]) => project(lon, lat));
  return `M${start[0].toFixed(1)},${start[1].toFixed(1)} L${rest
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' L')} Z`;
}

const CONTINENTS = [
  [
    [-165, 68], [-140, 70], [-95, 78], [-75, 68], [-60, 50], [-53, 47], [-65, 44],
    [-75, 35], [-81, 25], [-97, 18], [-105, 21], [-115, 29], [-124, 40], [-130, 55],
    [-152, 60], [-165, 68],
  ], // Amérique du Nord
  [
    [-77, 8], [-60, 10], [-50, 0], [-35, -6], [-40, -18], [-48, -25], [-58, -35],
    [-68, -55], [-73, -45], [-71, -30], [-70, -18], [-78, -5], [-77, 8],
  ], // Amérique du Sud
  [
    [-9, 43], [-9, 52], [5, 58], [10, 63], [25, 70], [40, 66], [40, 55], [30, 45],
    [19, 40], [13, 38], [-5, 36], [-9, 43],
  ], // Europe
  [
    [-17, 21], [-6, 35], [10, 37], [32, 31], [43, 12], [51, 12], [45, 2], [40, -15],
    [35, -25], [20, -35], [12, -17], [10, 4], [-5, 5], [-17, 21],
  ], // Afrique
  [
    [35, 45], [48, 41], [45, 25], [60, 13], [75, 8], [93, 16], [101, 3], [109, 10],
    [120, 23], [122, 31], [131, 44], [142, 46], [160, 60], [170, 68], [140, 73],
    [100, 76], [70, 72], [60, 50], [50, 42], [35, 45],
  ], // Asie
  [
    [113, -22], [122, -18], [129, -12], [137, -12], [142, -11], [145, -17],
    [153, -28], [150, -38], [140, -38], [131, -32], [115, -34], [113, -22],
  ], // Océanie
];

const CONTINENT_PATHS = CONTINENTS.map(buildPath);

// Coordonnées approximatives (longitude, latitude) de chaque pays, dans
// l'ordre de COUNTRIES, pour placer un point sur la carte.
const COUNTRY_COORDS = [
  [12.45, 41.9], // Vatican
  [7.42, 43.73], // Monaco
  [166.9, -0.5], // Nauru
  [179.2, -8.5], // Tuvalu
  [12.45, 43.94], // Saint-Marin
  [9.52, 47.14], // Liechtenstein
  [171.2, 7.1], // Îles Marshall
  [-62.7, 17.3], // Saint-Christophe-et-Niévès
  [73.5, 3.2], // Maldives
  [14.5, 35.9], // Malte
  [-61.7, 12.1], // Grenade
  [-61.2, 13.2], // Saint-Vincent-et-les-Grenadines
  [-59.6, 13.2], // Barbade
  [-61.8, 17.1], // Antigua-et-Barbuda
  [55.5, -4.6], // Seychelles
  [134.6, 7.5], // Palaos
  [1.52, 42.5], // Andorre
  [-60.9, 13.9], // Sainte-Lucie
  [158.2, 6.9], // Micronésie
  [103.8, 1.35], // Singapour
  [-175.2, -21.1], // Tonga
  [-61.4, 15.4], // Dominique
  [50.6, 26.2], // Bahreïn
  [173.0, 1.4], // Kiribati
  [6.6, 0.2], // Sao Tomé-et-Principe
  [57.5, -20.2], // Maurice
  [43.3, -11.7], // Comores
  [6.13, 49.6], // Luxembourg
  [-172.1, -13.8], // Samoa
  [-24.0, 16.0], // Cap-Vert
  [-61.4, 10.7], // Trinité-et-Tobago
  [114.7, 4.5], // Brunei
  [35.2, 31.9], // Palestine
  [33.4, 35.1], // Chypre
  [35.8, 33.9], // Liban
  [-77.3, 18.1], // Jamaïque
  [-15.3, 13.5], // Gambie
  [51.2, 25.3], // Qatar
  [166.9, -17.7], // Vanuatu
  [19.3, 42.7], // Monténégro
  [-77.4, 24.3], // Bahamas
  [125.7, -8.9], // Timor oriental
  [31.5, -26.5], // Eswatini
  [47.5, 29.3], // Koweït
  [178.0, -17.8], // Fidji
  [14.8, 46.1], // Slovénie
  [34.9, 31.5], // Israël
  [-88.9, 13.8], // Salvador
  [-88.5, 17.2], // Belize
  [42.6, 11.6], // Djibouti
  [21.7, 41.6], // Macédoine du Nord
  [30.0, -1.9], // Rwanda
  [-72.3, 18.9], // Haïti
  [29.9, -3.4], // Burundi
  [10.3, 1.6], // Guinée équatoriale
  [19.8, 41.2], // Albanie
  [160.0, -9.4], // Salomon
  [45.0, 40.3], // Arménie
  [28.2, -29.6], // Lesotho
  [4.5, 50.6], // Belgique
  [28.4, 47.0], // Moldavie
  [-15.2, 12.0], // Guinée-Bissau
  [89.6, 27.5], // Bhoutan
  [8.2, 46.8], // Suisse
  [5.3, 52.2], // Pays-Bas
  [10.0, 56.0], // Danemark
  [25.0, 58.6], // Estonie
  [-70.5, 18.7], // République dominicaine
  [19.7, 48.7], // Slovaquie
  [-84.1, 9.9], // Costa Rica
  [17.8, 44.2], // Bosnie-Herzégovine
  [15.9, 45.3], // Croatie
  [1.2, 8.6], // Togo
  [24.6, 56.9], // Lettonie
  [24.1, 55.2], // Lituanie
  [79.9, 6.9], // Sri Lanka
  [43.4, 42.3], // Géorgie
  [-8.0, 53.3], // Irlande
  [-11.8, 8.5], // Sierra Leone
  [-80.1, 8.9], // Panama
  [15.5, 49.8], // Tchéquie
  [54.4, 24.0], // Émirats arabes unis
  [14.5, 47.5], // Autriche
  [47.6, 40.4], // Azerbaïdjan
  [20.9, 44.2], // Serbie
  [36.2, 31.2], // Jordanie
  [-8.0, 39.5], // Portugal
  [19.5, 47.2], // Hongrie
  [127.8, 36.5], // Corée du Sud
  [-19.0, 65.0], // Islande
  [-90.5, 15.5], // Guatemala
  [-77.8, 21.5], // Cuba
  [25.3, 42.7], // Bulgarie
  [-9.4, 6.4], // Liberia
  [-86.6, 14.6], // Honduras
  [2.3, 9.3], // Bénin
  [39.8, 15.3], // Érythrée
  [34.3, -13.5], // Malawi
  [127.5, 40.0], // Corée du Nord
  [-85.2, 12.9], // Nicaragua
  [22.0, 39.0], // Grèce
  [71.3, 38.6], // Tadjikistan
  [84.1, 28.4], // Népal
  [90.4, 23.7], // Bangladesh
  [9.5, 34.0], // Tunisie
  [-56.0, 4.1], // Suriname
  [-56.0, -32.9], // Uruguay
  [104.9, 12.6], // Cambodge
  [38.5, 35.0], // Syrie
  [-14.5, 14.5], // Sénégal
  [74.6, 41.2], // Kirghizistan
  [-58.9, 4.9], // Guyana
  [102.6, 19.9], // Laos
  [25.0, 45.9], // Roumanie
  [-1.0, 7.9], // Ghana
  [32.6, 1.4], // Ouganda
  [-1.5, 52.5], // Royaume-Uni
  [-9.7, 9.9], // Guinée
  [11.6, -0.6], // Gabon
  [172.0, -41.0], // Nouvelle-Zélande
  [-1.5, 12.4], // Burkina Faso
  [-78.5, -1.8], // Équateur
  [121.8, 12.9], // Philippines
  [12.5, 42.8], // Italie
  [56.1, 21.5], // Oman
  [19.1, 52.1], // Pologne
  [-5.5, 7.5], // Côte d'Ivoire
  [101.9, 4.2], // Malaisie
  [108.3, 14.1], // Vietnam
  [25.7, 61.9], // Finlande
  [15.8, -0.7], // République du Congo
  [10.4, 51.2], // Allemagne
  [138, 36], // Japon
  [8.5, 60.5], // Norvège
  [29.1, -19.0], // Zimbabwe
  [-58.4, -23.4], // Paraguay
  [43.7, 33.2], // Irak
  [-6.8, 32.0], // Maroc
  [64.6, 41.4], // Ouzbékistan
  [18.6, 60.1], // Suède
  [144.0, -6.3], // Papouasie-Nouvelle-Guinée
  [12.4, 5.7], // Cameroun
  [59.6, 38.0], // Turkménistan
  [-3.7, 40.4], // Espagne
  [101.0, 15.9], // Thaïlande
  [44.2, 15.4], // Yémen
  [2.2, 46.6], // France
  [37.5, 0.3], // Kenya
  [24.7, -22.3], // Botswana
  [46.9, -18.9], // Madagascar
  [31, 49], // Ukraine
  [31.6, 6.9], // Soudan du Sud
  [20.9, 6.6], // République centrafricaine
  [46.2, 5.2], // Somalie
  [69.2, 34.5], // Afghanistan
  [96.2, 21.9], // Myanmar
  [27.8, -13.1], // Zambie
  [-71.0, -35.7], // Chili
  [35.2, 39.0], // Turquie
  [35.5, -18.7], // Mozambique
  [17.1, -22.6], // Namibie
  [73.0, 33.7], // Pakistan
  [-66.6, 8.0], // Venezuela
  [8.7, 9.1], // Nigeria
  [35.7, -6.4], // Tanzanie
  [29, 26], // Égypte
  [-10.9, 20.0], // Mauritanie
  [-64.7, -16.7], // Bolivie
  [40.5, 9.1], // Éthiopie
  [-74.3, 4.6], // Colombie
  [24.0, -29.0], // Afrique du Sud
  [-4.0, 17.6], // Mali
  [17.9, -11.2], // Angola
  [8.1, 17.6], // Niger
  [18.7, 15.0], // Tchad
  [-76.0, -9.2], // Pérou
  [103.8, 46.9], // Mongolie
  [53.7, 32.4], // Iran
  [17.2, 27.0], // Libye
  [30.2, 15.6], // Soudan
  [113.9, -0.8], // Indonésie
  [-102, 23], // Mexique
  [45.1, 24.0], // Arabie saoudite
  [23.6, -2.9], // Rép. dém. du Congo
  [3.0, 28.0], // Algérie
  [66.9, 48.0], // Kazakhstan
  [-64, -34], // Argentine
  [78, 22], // Inde
  [134, -25], // Australie
  [-51, -10], // Brésil
  [104, 35], // Chine
  [-98.6, 39.8], // États-Unis
  [-96, 60], // Canada
  [60, 61.5], // Russie
];

// Fond de carte du monde : les continents restent dans une teinte neutre et
// discrète, tandis qu'un point s'allume (couleur d'accent) sur chaque pays
// débloqué, pour visualiser la conquête progressive. pointerEvents="none"
// pour ne jamais intercepter les appuis. unlockedFlags est optionnel : sans
// lui (sur les écrans de détail/choix/quiz), le fond reste purement
// décoratif, sans points. Rendu une seconde fois à l'intérieur de chaque
// Modal, qui a son propre calque et ne voit donc pas le fond de l'écran
// principal — ça garde la carte discrète cohérente sur tous les écrans.
function WorldMapBackground({ unlockedFlags }) {
  return (
    <View style={styles.mapBackground} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice">
        {CONTINENT_PATHS.map((d, index) => (
          <Path key={index} d={d} fill={COLORS.border} />
        ))}
        {unlockedFlags &&
          COUNTRY_COORDS.map(([lon, lat], index) => {
            const [x, y] = project(lon, lat);
            return (
              <Circle
                key={index}
                cx={x}
                cy={y}
                r={unlockedFlags[index] ? 9 : 5}
                fill={unlockedFlags[index] ? 'rgba(47, 95, 214, 0.55)' : 'rgba(22, 35, 58, 0.12)'}
              />
            );
          })}
      </Svg>
    </View>
  );
}

function QuizModal({ visible, country, allCountries, onCorrect, onClose }) {
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const cardPulse = useRef(new Animated.Value(1)).current;
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    if (visible && country) {
      setQuestion(buildQuizQuestion(country, allCountries));
      setSelected(null);
      cardPulse.setValue(1);
    }
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [visible, country, allCountries, cardPulse]);

  if (!visible || !question) return null;

  const handleSelect = (option) => {
    if (selected !== null) return;
    setSelected(option);
    const isCorrect = option === question.correctAnswer;
    if (isCorrect) {
      Animated.sequence([
        Animated.timing(cardPulse, { toValue: 1.04, duration: 150, useNativeDriver: true }),
        Animated.spring(cardPulse, { toValue: 1, useNativeDriver: true, friction: 4 }),
      ]).start();
      onCorrect();
    }
    closeTimeoutRef.current = setTimeout(onClose, QUIZ_RESULT_AUTO_CLOSE_MS);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <WorldMapBackground />
        <View style={styles.modalTint} />
        <Animated.View style={[styles.modalCard, { transform: [{ scale: cardPulse }] }]}>
          <Text style={styles.modalFlag}>{country.flag}</Text>
          <Text style={styles.modalPrompt}>{question.prompt}</Text>
          {question.options.map((option) => {
            const isThisCorrect = option === question.correctAnswer;
            const showResult = selected !== null;
            return (
              <Pressable
                key={option}
                onPress={() => handleSelect(option)}
                disabled={showResult}
                style={[
                  styles.modalOption,
                  showResult && isThisCorrect && styles.modalOptionCorrect,
                  showResult && selected === option && !isThisCorrect && styles.modalOptionWrong,
                ]}
              >
                <Text style={[styles.modalOptionText, question.isEmoji && styles.modalOptionEmoji]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
          {selected !== null && (
            <Text
              style={[
                styles.modalResultText,
                selected === question.correctAnswer ? styles.modalResultCorrect : styles.modalResultWrong,
              ]}
            >
              {selected === question.correctAnswer
                ? `Bonne réponse ! +${QUIZ_BONUS} pts`
                : `Dommage ! La bonne réponse était : ${question.correctAnswer}`}
            </Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function CountryDetailModal({ visible, country, score, threshold, onClose }) {
  if (!country) return null;
  const contributions = getContributions(country, score);
  const progressPct = Math.min(100, Math.round((score / threshold) * 100));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <WorldMapBackground />
        <View style={styles.modalTint} />
        <View style={styles.detailCard}>
          <Pressable onPress={onClose} style={styles.detailCloseButton} hitSlop={8}>
            <Text style={styles.detailCloseText}>✕</Text>
          </Pressable>
          <Text style={styles.detailFlag}>{country.flag}</Text>
          <Text style={styles.detailName}>{country.name}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Superficie</Text>
            <Text style={styles.detailValue}>
              {country.area} · {contributions[0].value} pts
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Population</Text>
            <Text style={styles.detailValue}>
              {formatNumber(country.population)} hab. · {contributions[1].value} pts
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>PIB</Text>
            <Text style={styles.detailValue}>
              {formatMoneyMillions(country.gdp)} · {contributions[2].value} pts
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Budget militaire</Text>
            <Text style={styles.detailValue}>
              {formatMoneyMillions(country.military)} · {contributions[3].value} pts
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Richesse (PIB/hab.)</Text>
            <Text style={styles.detailValue}>
              {formatWealthPerCapita(country.wealth)} · {contributions[4].value} pts
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Capitale</Text>
            <Text style={styles.detailValue}>{country.capital}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Langue officielle</Text>
            <Text style={styles.detailValue}>{country.language}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Continent</Text>
            <Text style={styles.detailValue}>{country.continent}</Text>
          </View>
          <Text style={[styles.score, styles.detailScore, { color: getScoreColor(score, threshold) }]}>
            Score : {score} / {threshold}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Modale de choix affichée quand un pays atteint son seuil : le joueur
// choisit lequel des 3 pays proposés rejoint sa liste de pays débloqués. Pas
// de bouton de fermeture ni de onRequestClose actif : le choix est
// obligatoire, sinon la progression resterait bloquée sans pays jouable de
// plus.
function CountryChoiceModal({ visible, sourceCountry, options, onChoose }) {
  if (!visible || !sourceCountry || options.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.modalBackdrop}>
        <WorldMapBackground />
        <View style={styles.modalTint} />
        <View style={styles.choiceCard}>
          <Text style={styles.choiceTitle}>{sourceCountry.name} est développé !</Text>
          <Text style={styles.choiceSubtitle}>Choisis le prochain pays à conquérir :</Text>
          {options.map((country) => (
            <Pressable key={country.id} onPress={() => onChoose(country.id)} style={styles.choiceOption}>
              <Text style={styles.choiceFlag}>{country.flag}</Text>
              <View style={styles.choiceInfo}>
                <Text style={styles.choiceName}>{country.name}</Text>
                <Text style={styles.choiceArea}>{country.area}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function CountryCard({ country, allCountries, score, threshold, isNew, isUnlocked, onDevelop, onQuizCorrect }) {
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const [displayedScore, setDisplayedScore] = useState(0);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const celebrateAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(isUnlocked ? 1 : 0)).current;
  const entranceAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const [showBadge, setShowBadge] = useState(isUnlocked);
  const prevScoreRef = useRef(score);
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizOnCooldown, setQuizOnCooldown] = useState(false);
  const cooldownTimeoutRef = useRef(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    Animated.timing(scoreAnim, {
      toValue: score,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [score, scoreAnim]);

  useEffect(() => {
    const id = scoreAnim.addListener(({ value }) => setDisplayedScore(Math.round(value)));
    return () => scoreAnim.removeListener(id);
  }, [scoreAnim]);

  useEffect(() => {
    const prev = prevScoreRef.current;
    if (prev < threshold && score >= threshold) {
      Animated.sequence([
        Animated.timing(cardScale, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      ]).start();
      Animated.sequence([
        Animated.timing(celebrateAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
        Animated.timing(celebrateAnim, { toValue: 0, duration: 450, useNativeDriver: false }),
      ]).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    prevScoreRef.current = score;
  }, [score, threshold, cardScale, celebrateAnim]);

  useEffect(() => {
    if (isUnlocked) {
      setShowBadge(true);
      Animated.spring(badgeAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    } else {
      Animated.timing(badgeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setShowBadge(false);
      });
    }
  }, [isUnlocked, badgeAnim]);

  // Anime l'entrée uniquement pour un pays qui vient d'être débloqué pendant
  // cette session (isNew) : les cartes déjà débloquées au chargement de la
  // sauvegarde démarrent directement à pleine opacité.
  useEffect(() => {
    if (isNew) {
      Animated.timing(entranceAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [isNew, entranceAnim]);

  useEffect(() => () => {
    if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, friction: 3, tension: 140 }),
    ]).start();
    onDevelop();
  };

  const handleQuizClose = () => {
    setQuizVisible(false);
    setQuizOnCooldown(true);
    cooldownTimeoutRef.current = setTimeout(() => setQuizOnCooldown(false), QUIZ_COOLDOWN_MS);
  };

  const progressWidth = scoreAnim.interpolate({
    inputRange: [0, threshold],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const contributions = getContributions(country, displayedScore);
  const isQuizDisabled = quizOnCooldown;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
          transform: [
            { translateY: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
            { scale: cardScale },
          ],
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.celebrateOverlay,
          { opacity: celebrateAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) },
        ]}
      />
      <Text style={styles.flagBackground} pointerEvents="none">
        {country.flag}
      </Text>
      <Pressable onPress={() => setDetailVisible(true)}>
        <View style={styles.cardHeader}>
          <Text style={styles.countryName}>{country.name}</Text>
          {showBadge && (
            <Animated.Text
              style={[styles.unlockedBadge, { opacity: badgeAnim, transform: [{ scale: badgeAnim }] }]}
            >
              Débloqué !
            </Animated.Text>
          )}
        </View>
      </Pressable>
      <Text style={styles.criterion}>
        Superficie : {country.area} · {contributions[0].value} pts
      </Text>
      <Text style={styles.criterion}>
        Population : {formatNumber(country.population)} habitants · {contributions[1].value} pts
      </Text>
      <Text style={[styles.score, { color: getScoreColor(displayedScore, threshold) }]}>
        Score : {displayedScore} / {threshold}
      </Text>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <View style={styles.buttonRow}>
        <Pressable style={styles.buttonFlex} onPress={handlePress}>
          <Animated.View style={[styles.button, { transform: [{ scale: buttonScale }] }]}>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Développer</Text>
            </View>
          </Animated.View>
        </Pressable>
        <Pressable
          style={styles.buttonFlex}
          onPress={() => setQuizVisible(true)}
          disabled={isQuizDisabled}
        >
          <View style={[styles.quizButton, isQuizDisabled && styles.buttonDisabled]}>
            <Text style={[styles.buttonText, isQuizDisabled && styles.buttonTextDisabled]}>
              🧠 Quiz
            </Text>
          </View>
        </Pressable>
      </View>
      <QuizModal
        visible={quizVisible}
        country={country}
        allCountries={allCountries}
        onCorrect={onQuizCorrect}
        onClose={handleQuizClose}
      />
      <CountryDetailModal
        visible={detailVisible}
        country={country}
        score={displayedScore}
        threshold={threshold}
        onClose={() => setDetailVisible(false)}
      />
    </Animated.View>
  );
}

// Barre fixe en haut de l'écran principal (hors ScrollView, donc toujours
// visible même quand la liste défile) : score total, progression globale
// (pays débloqués / total), et raccourcis son/réinitialisation.
function DashboardBar({ totalScore, unlockedCount, totalCount, soundEnabled, onToggleSound, onReset }) {
  return (
    <View style={styles.dashboard}>
      <View style={styles.dashboardTopRow}>
        <Text style={styles.dashboardTitle}>Conquer The World</Text>
        <View style={styles.dashboardActions}>
          <Pressable onPress={onToggleSound} style={styles.dashboardIconButton} hitSlop={8}>
            <Text style={styles.dashboardIconText}>{soundEnabled ? '🔊' : '🔇'}</Text>
          </Pressable>
          <Pressable onPress={onReset} style={styles.dashboardIconButton} hitSlop={8}>
            <Text style={styles.dashboardIconText}>♻️</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.dashboardStatsRow}>
        <View style={styles.statChip}>
          <Text style={styles.statChipLabel}>Score total</Text>
          <Text style={styles.statChipValue}>{totalScore}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statChipLabel}>Pays débloqués</Text>
          <Text style={styles.statChipValue}>
            {unlockedCount} / {totalCount}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function App() {
  const defaultState = useRef(getDefaultGameState()).current;
  const [scores, setScores] = useState(defaultState.scores);
  const [unlockedIds, setUnlockedIds] = useState(defaultState.unlockedIds);
  const [pendingChoice, setPendingChoice] = useState(defaultState.pendingChoice);
  const [isLoaded, setIsLoaded] = useState(false);
  // Pas de son pour l'instant : l'état et le bouton restent en place pour
  // brancher les effets sonores plus tard sans retoucher l'interface.
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Capture les pays déjà débloqués au chargement de la sauvegarde, pour ne
  // jouer l'animation d'entrée des cartes que sur les pays débloqués pendant
  // cette session (voir isNew sur CountryCard).
  const initialUnlockedIdsRef = useRef(null);

  // Chargement de la sauvegarde au lancement. isLoaded ne passe à true
  // qu'une fois la lecture terminée (réussie ou non), pour ne jamais
  // sauvegarder l'état par défaut par-dessus une sauvegarde existante
  // avant qu'elle ait eu le temps d'être relue.
  useEffect(() => {
    let cancelled = false;
    loadGameState().then((loaded) => {
      if (!cancelled) {
        setScores(loaded.scores);
        setUnlockedIds(loaded.unlockedIds);
        setPendingChoice(loaded.pendingChoice);
        initialUnlockedIdsRef.current = new Set(loaded.unlockedIds);
        setIsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sauvegarde automatique à chaque changement de score, de pays débloqué ou
  // de choix en attente.
  useEffect(() => {
    if (!isLoaded) return;
    saveGameState({ scores, unlockedIds, pendingChoice });
  }, [scores, unlockedIds, pendingChoice, isLoaded]);

  const handleResetPress = () => {
    Alert.alert(
      'Recommencer la partie ?',
      'Toute ta progression (scores, pays débloqués) sera définitivement effacée.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Recommencer',
          style: 'destructive',
          onPress: () => {
            const fresh = getDefaultGameState();
            setScores(fresh.scores);
            setUnlockedIds(fresh.unlockedIds);
            setPendingChoice(fresh.pendingChoice);
            initialUnlockedIdsRef.current = new Set(fresh.unlockedIds);
            clearGameState();
          },
        },
      ]
    );
  };

  // Si le pays vient de franchir son seuil pour la première fois, propose un
  // choix parmi 3 pays verrouillés de taille proche plutôt que de débloquer
  // automatiquement le suivant. Ne fait rien si un choix est déjà en attente
  // (un seul à la fois) ou si tous les pays sont déjà débloqués.
  const maybeTriggerChoice = (country, prevScore, newScore) => {
    const threshold = getUnlockThreshold(country);
    if (prevScore >= threshold || newScore < threshold || pendingChoice) return;
    const lockedCountries = COUNTRIES.filter((c) => !unlockedIds.includes(c.id));
    if (lockedCountries.length === 0) return;
    const candidates = pickChoiceCandidates(country, lockedCountries);
    setPendingChoice({ sourceId: country.id, optionIds: candidates.map((c) => c.id) });
  };

  const handleDevelop = (id) => {
    const country = COUNTRIES.find((c) => c.id === id);
    const prevScore = scores[id] || 0;
    const newScore = prevScore + SCORE_INCREMENT;
    setScores((prev) => ({ ...prev, [id]: newScore }));
    maybeTriggerChoice(country, prevScore, newScore);
  };

  const handleQuizCorrect = (id) => {
    const country = COUNTRIES.find((c) => c.id === id);
    const prevScore = scores[id] || 0;
    const newScore = prevScore + QUIZ_BONUS;
    setScores((prev) => ({ ...prev, [id]: newScore }));
    maybeTriggerChoice(country, prevScore, newScore);
  };

  const handleChooseCountry = (id) => {
    setUnlockedIds((prev) => [...prev, id]);
    setPendingChoice(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const unlockedFlags = COUNTRIES.map((c) => unlockedIds.includes(c.id));
  const totalScore = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const latestUnlockedId = unlockedIds.length > 1 ? unlockedIds[unlockedIds.length - 1] : null;
  const choiceSourceCountry = pendingChoice ? COUNTRIES.find((c) => c.id === pendingChoice.sourceId) : null;
  const choiceOptions = pendingChoice
    ? pendingChoice.optionIds.map((id) => COUNTRIES.find((c) => c.id === id))
    : [];

  if (!isLoaded) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <WorldMapBackground unlockedFlags={unlockedFlags} />
      <DashboardBar
        totalScore={totalScore}
        unlockedCount={unlockedIds.length}
        totalCount={COUNTRIES.length}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
        onReset={handleResetPress}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {unlockedIds.map((id) => {
          const country = COUNTRIES.find((c) => c.id === id);
          const isNew = initialUnlockedIdsRef.current ? !initialUnlockedIdsRef.current.has(id) : false;
          return (
            <CountryCard
              key={country.id}
              country={country}
              allCountries={COUNTRIES}
              score={scores[id] || 0}
              threshold={getUnlockThreshold(country)}
              isNew={isNew}
              isUnlocked={id === latestUnlockedId}
              onDevelop={() => handleDevelop(id)}
              onQuizCorrect={() => handleQuizCorrect(id)}
            />
          );
        })}
      </ScrollView>
      <CountryChoiceModal
        visible={!!pendingChoice}
        sourceCountry={choiceSourceCountry}
        options={choiceOptions}
        onChoose={handleChooseCountry}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.muted,
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.canvas,
    overflow: 'hidden',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },

  // Dashboard fixe
  dashboard: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  dashboardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dashboardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.surface,
    letterSpacing: 0.2,
  },
  dashboardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dashboardIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardIconText: {
    fontSize: 16,
  },
  dashboardStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statChipValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.gold,
  },

  // Carte pays
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
    overflow: 'hidden',
  },
  celebrateOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.success,
  },
  flagBackground: {
    position: 'absolute',
    right: -14,
    top: -24,
    fontSize: 100,
    opacity: 0.1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countryName: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.navy,
  },
  unlockedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.success,
    borderWidth: 1.5,
    borderColor: COLORS.success,
    backgroundColor: 'transparent',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  criterion: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.muted,
    marginTop: 4,
  },
  score: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.track,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.blue,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  buttonFlex: {
    flex: 1,
  },
  button: {
    backgroundColor: COLORS.blue,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  quizButton: {
    backgroundColor: COLORS.teal,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.surface,
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonTextDisabled: {
    color: COLORS.muted,
  },

  // Modales (quiz, détail, choix) : même fond carte + voile navy translucide
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22, 35, 58, 0.45)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 22,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalFlag: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalPrompt: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 18,
  },
  modalOption: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  modalOptionCorrect: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(31, 157, 99, 0.12)',
  },
  modalOptionWrong: {
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(201, 74, 58, 0.10)',
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
  },
  modalOptionEmoji: {
    fontSize: 32,
  },
  modalResultText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalResultCorrect: {
    color: COLORS.success,
  },
  modalResultWrong: {
    color: COLORS.danger,
  },
  detailCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 26,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  detailCloseButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  detailCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
  },
  detailFlag: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 4,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.muted,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  detailScore: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 18,
  },
  choiceCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 22,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  choiceTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 4,
  },
  choiceSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  choiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  choiceFlag: {
    fontSize: 34,
    marginRight: 12,
  },
  choiceInfo: {
    flex: 1,
  },
  choiceName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
  },
  choiceArea: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.muted,
    marginTop: 2,
  },
});
