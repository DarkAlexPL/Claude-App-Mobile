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

// Triés par superficie croissante. areaKm2/population sont les valeurs brutes
// utilisées pour le calcul du score et des seuils ; area est la chaîne déjà
// formatée pour l'affichage (gère les décimales de Vatican/Monaco). gdp et
// military sont en millions de dollars (PIB nominal et budget militaire
// annuel), wealth est le PIB par habitant en dollars — trois valeurs
// approximatives à but ludique/pédagogique (pas des chiffres officiels au
// dollar près). capital, language et continent alimentent les questions de
// quiz (voir QUIZ_QUESTION_TYPES). Pour ajouter un pays : une entrée { id,
// name, area, areaKm2, population, gdp, military, wealth, flag, capital,
// language, continent }.
const COUNTRIES = [
  { id: 'va', name: 'Vatican', area: '0,44 km²', areaKm2: 0.44, population: 800, gdp: 20, military: 10, wealth: 90000, flag: '🇻🇦', capital: 'Cité du Vatican', language: 'Italien', continent: 'Europe' },
  { id: 'mc', name: 'Monaco', area: '2,1 km²', areaKm2: 2.1, population: 39000, gdp: 8700, military: 15, wealth: 234000, flag: '🇲🇨', capital: 'Monaco-Ville', language: 'Français', continent: 'Europe' },
  { id: 'mt', name: 'Malte', area: '316 km²', areaKm2: 316, population: 530000, gdp: 17700, military: 80, wealth: 33000, flag: '🇲🇹', capital: 'La Valette', language: 'Maltais', continent: 'Europe' },
  { id: 'ad', name: 'Andorre', area: '468 km²', areaKm2: 468, population: 80000, gdp: 3300, military: 5, wealth: 42000, flag: '🇦🇩', capital: 'Andorre-la-Vieille', language: 'Catalan', continent: 'Europe' },
  { id: 'sg', name: 'Singapour', area: '728 km²', areaKm2: 728, population: 5900000, gdp: 501000, military: 13000, wealth: 84000, flag: '🇸🇬', capital: 'Singapour', language: 'Anglais', continent: 'Asie' },
  { id: 'lu', name: 'Luxembourg', area: '2 586 km²', areaKm2: 2586, population: 660000, gdp: 85000, military: 500, wealth: 128000, flag: '🇱🇺', capital: 'Luxembourg', language: 'Luxembourgeois', continent: 'Europe' },
  { id: 'pt', name: 'Portugal', area: '92 212 km²', areaKm2: 92212, population: 10300000, gdp: 289000, military: 4300, wealth: 28000, flag: '🇵🇹', capital: 'Lisbonne', language: 'Portugais', continent: 'Europe' },
  { id: 'gr', name: 'Grèce', area: '131 957 km²', areaKm2: 131957, population: 10400000, gdp: 238000, military: 8000, wealth: 22900, flag: '🇬🇷', capital: 'Athènes', language: 'Grec', continent: 'Europe' },
  { id: 'jp', name: 'Japon', area: '377 975 km²', areaKm2: 377975, population: 123000000, gdp: 4200000, military: 50000, wealth: 33900, flag: '🇯🇵', capital: 'Tokyo', language: 'Japonais', continent: 'Asie' },
  { id: 'fr', name: 'France', area: '551 695 km²', areaKm2: 551695, population: 68000000, gdp: 3030000, military: 61000, wealth: 44500, flag: '🇫🇷', capital: 'Paris', language: 'Français', continent: 'Europe' },
  { id: 'ke', name: 'Kenya', area: '580 367 km²', areaKm2: 580367, population: 55000000, gdp: 118000, military: 1200, wealth: 2100, flag: '🇰🇪', capital: 'Nairobi', language: 'Swahili', continent: 'Afrique' },
  { id: 'ua', name: 'Ukraine', area: '603 550 km²', areaKm2: 603550, population: 36000000, gdp: 178000, military: 64000, wealth: 5000, flag: '🇺🇦', capital: 'Kiev', language: 'Ukrainien', continent: 'Europe' },
  { id: 'eg', name: 'Égypte', area: '1 002 450 km²', areaKm2: 1002450, population: 112000000, gdp: 380000, military: 4500, wealth: 3500, flag: '🇪🇬', capital: 'Le Caire', language: 'Arabe', continent: 'Afrique' },
  { id: 'mx', name: 'Mexique', area: '1 964 375 km²', areaKm2: 1964375, population: 128000000, gdp: 1790000, military: 8500, wealth: 13800, flag: '🇲🇽', capital: 'Mexico', language: 'Espagnol', continent: 'Amérique' },
  { id: 'ar', name: 'Argentine', area: '2 780 400 km²', areaKm2: 2780400, population: 46000000, gdp: 640000, military: 3000, wealth: 13700, flag: '🇦🇷', capital: 'Buenos Aires', language: 'Espagnol', continent: 'Amérique' },
  { id: 'in', name: 'Inde', area: '3 287 263 km²', areaKm2: 3287263, population: 1428000000, gdp: 3730000, military: 83000, wealth: 2600, flag: '🇮🇳', capital: 'New Delhi', language: 'Hindi', continent: 'Asie' },
  { id: 'au', name: 'Australie', area: '7 692 024 km²', areaKm2: 7692024, population: 26000000, gdp: 1690000, military: 32000, wealth: 65000, flag: '🇦🇺', capital: 'Canberra', language: 'Anglais', continent: 'Océanie' },
  { id: 'br', name: 'Brésil', area: '8 515 767 km²', areaKm2: 8515767, population: 216000000, gdp: 2170000, military: 22000, wealth: 10000, flag: '🇧🇷', capital: 'Brasília', language: 'Portugais', continent: 'Amérique' },
  { id: 'cn', name: 'Chine', area: '9 596 961 km²', areaKm2: 9596961, population: 1410000000, gdp: 17700000, military: 296000, wealth: 12600, flag: '🇨🇳', capital: 'Pékin', language: 'Mandarin', continent: 'Asie' },
  { id: 'ca', name: 'Canada', area: '9 984 670 km²', areaKm2: 9984670, population: 39000000, gdp: 2140000, military: 27000, wealth: 53000, flag: '🇨🇦', capital: 'Ottawa', language: 'Anglais', continent: 'Amérique' },
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
const CHOICE_CANDIDATE_POOL_SIZE = 6;

// Tire les pays proposés au joueur quand un pays atteint son seuil : parmi
// les pays encore verrouillés, on retient ceux dont la taille (superficie +
// population normalisées) est la plus proche de celle du pays qui vient
// d'être développé, puis on en tire 3 au hasard dans ce sous-groupe pour
// garder un peu de variété d'une partie à l'autre.
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
  [14.5, 35.9], // Malte
  [1.52, 42.5], // Andorre
  [103.8, 1.35], // Singapour
  [6.13, 49.6], // Luxembourg
  [-8.0, 39.5], // Portugal
  [22.0, 39.0], // Grèce
  [138, 36], // Japon
  [2.2, 46.6], // France
  [37.5, 0.3], // Kenya
  [31, 49], // Ukraine
  [29, 26], // Égypte
  [-102, 23], // Mexique
  [-64, -34], // Argentine
  [78, 22], // Inde
  [134, -25], // Australie
  [-51, -10], // Brésil
  [104, 35], // Chine
  [-96, 60], // Canada
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
