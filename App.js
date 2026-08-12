import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path } from 'react-native-svg';
import { Animated, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

// Triés par superficie croissante. areaKm2/population sont les valeurs brutes
// utilisées pour le calcul du score et des seuils ; area est la chaîne déjà
// formatée pour l'affichage (gère les décimales de Vatican/Monaco). capital,
// language et continent alimentent les questions de quiz (voir QUIZ_QUESTION_TYPES).
// Pour ajouter un pays : une entrée { id, name, area, areaKm2, population, flag,
// capital, language, continent }.
const COUNTRIES = [
  { id: 'va', name: 'Vatican', area: '0,44 km²', areaKm2: 0.44, population: 800, flag: '🇻🇦', capital: 'Cité du Vatican', language: 'Italien', continent: 'Europe' },
  { id: 'mc', name: 'Monaco', area: '2,1 km²', areaKm2: 2.1, population: 39000, flag: '🇲🇨', capital: 'Monaco-Ville', language: 'Français', continent: 'Europe' },
  { id: 'mt', name: 'Malte', area: '316 km²', areaKm2: 316, population: 530000, flag: '🇲🇹', capital: 'La Valette', language: 'Maltais', continent: 'Europe' },
  { id: 'ad', name: 'Andorre', area: '468 km²', areaKm2: 468, population: 80000, flag: '🇦🇩', capital: 'Andorre-la-Vieille', language: 'Catalan', continent: 'Europe' },
  { id: 'sg', name: 'Singapour', area: '728 km²', areaKm2: 728, population: 5900000, flag: '🇸🇬', capital: 'Singapour', language: 'Anglais', continent: 'Asie' },
  { id: 'lu', name: 'Luxembourg', area: '2 586 km²', areaKm2: 2586, population: 660000, flag: '🇱🇺', capital: 'Luxembourg', language: 'Luxembourgeois', continent: 'Europe' },
  { id: 'pt', name: 'Portugal', area: '92 212 km²', areaKm2: 92212, population: 10300000, flag: '🇵🇹', capital: 'Lisbonne', language: 'Portugais', continent: 'Europe' },
  { id: 'gr', name: 'Grèce', area: '131 957 km²', areaKm2: 131957, population: 10400000, flag: '🇬🇷', capital: 'Athènes', language: 'Grec', continent: 'Europe' },
  { id: 'jp', name: 'Japon', area: '377 975 km²', areaKm2: 377975, population: 123000000, flag: '🇯🇵', capital: 'Tokyo', language: 'Japonais', continent: 'Asie' },
  { id: 'fr', name: 'France', area: '551 695 km²', areaKm2: 551695, population: 68000000, flag: '🇫🇷', capital: 'Paris', language: 'Français', continent: 'Europe' },
  { id: 'ke', name: 'Kenya', area: '580 367 km²', areaKm2: 580367, population: 55000000, flag: '🇰🇪', capital: 'Nairobi', language: 'Swahili', continent: 'Afrique' },
  { id: 'ua', name: 'Ukraine', area: '603 550 km²', areaKm2: 603550, population: 36000000, flag: '🇺🇦', capital: 'Kiev', language: 'Ukrainien', continent: 'Europe' },
  { id: 'eg', name: 'Égypte', area: '1 002 450 km²', areaKm2: 1002450, population: 112000000, flag: '🇪🇬', capital: 'Le Caire', language: 'Arabe', continent: 'Afrique' },
  { id: 'mx', name: 'Mexique', area: '1 964 375 km²', areaKm2: 1964375, population: 128000000, flag: '🇲🇽', capital: 'Mexico', language: 'Espagnol', continent: 'Amérique' },
  { id: 'ar', name: 'Argentine', area: '2 780 400 km²', areaKm2: 2780400, population: 46000000, flag: '🇦🇷', capital: 'Buenos Aires', language: 'Espagnol', continent: 'Amérique' },
  { id: 'in', name: 'Inde', area: '3 287 263 km²', areaKm2: 3287263, population: 1428000000, flag: '🇮🇳', capital: 'New Delhi', language: 'Hindi', continent: 'Asie' },
  { id: 'au', name: 'Australie', area: '7 692 024 km²', areaKm2: 7692024, population: 26000000, flag: '🇦🇺', capital: 'Canberra', language: 'Anglais', continent: 'Océanie' },
  { id: 'br', name: 'Brésil', area: '8 515 767 km²', areaKm2: 8515767, population: 216000000, flag: '🇧🇷', capital: 'Brasília', language: 'Portugais', continent: 'Amérique' },
  { id: 'cn', name: 'Chine', area: '9 596 961 km²', areaKm2: 9596961, population: 1410000000, flag: '🇨🇳', capital: 'Pékin', language: 'Mandarin', continent: 'Asie' },
  { id: 'ca', name: 'Canada', area: '9 984 670 km²', areaKm2: 9984670, population: 39000000, flag: '🇨🇦', capital: 'Ottawa', language: 'Anglais', continent: 'Amérique' },
];

const SCORE_INCREMENT = 10;
const QUIZ_BONUS = 20;
const QUIZ_COOLDOWN_MS = 6000;
const QUIZ_RESULT_AUTO_CLOSE_MS = 1800;

// Critères de score : chacun a un poids et une valeur de référence (le maximum
// réaliste au niveau mondial, pas seulement dans la liste actuelle) afin que
// les seuils restent stables si la liste s'étend vers les ~195 pays. Pour
// ajouter un critère plus tard (PIB, armée, richesse...), il suffit d'ajouter
// une entrée ici et un champ correspondant sur chaque pays.
const SCORE_CRITERIA = [
  { key: 'areaKm2', label: 'Superficie', weight: 0.5, maxValue: 17098242 }, // superficie de la Russie
  { key: 'population', label: 'Population', weight: 0.5, maxValue: 1450000000 }, // ~ Inde/Chine
];

const MIN_UNLOCK_THRESHOLD = 50;
const UNLOCK_THRESHOLD_RANGE = 300;

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

// « Taille » normalisée d'un pays (0 à ~1) combinant tous les critères de
// SCORE_CRITERIA selon leur poids respectif.
function getSizeIndex(country) {
  return SCORE_CRITERIA.reduce(
    (total, criterion) => total + criterion.weight * (country[criterion.key] / criterion.maxValue),
    0
  );
}

// Le seuil de déblocage du pays suivant est calibré sur la taille réelle
// (superficie + population) du pays courant plutôt que sur sa seule position
// dans la liste, arrondi au multiple de 10 le plus proche (clics de 10 pts).
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

function getScoreColor(score, threshold) {
  const ratio = Math.min(score, threshold) / threshold;
  if (ratio >= 0.7) return '#2e9e5b';
  if (ratio >= 0.3) return '#d98a1f';
  return '#5b6b7c';
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
// discrète, tandis qu'un point s'allume en bleu (couleur principale de
// l'app) sur chaque pays débloqué, pour visualiser la conquête progressive.
// pointerEvents="none" pour ne jamais intercepter les appuis ; les cartes
// opaques des pays recouvrent la majorité du fond, qui ne reste visible que
// dans les marges et l'en-tête.
function WorldMapBackground({ unlockedFlags }) {
  return (
    <View style={styles.mapBackground} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice">
        {CONTINENT_PATHS.map((d, index) => (
          <Path key={index} d={d} fill="#dde4ec" />
        ))}
        {COUNTRY_COORDS.map(([lon, lat], index) => {
          const [x, y] = project(lon, lat);
          return (
            <Circle
              key={index}
              cx={x}
              cy={y}
              r={unlockedFlags[index] ? 9 : 5}
              fill={unlockedFlags[index] ? 'rgba(46, 95, 163, 0.65)' : 'rgba(28, 39, 51, 0.18)'}
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

function CountryCard({ country, allCountries, score, threshold, isPlayable, isUnlocked, onDevelop, onQuizCorrect }) {
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const [displayedScore, setDisplayedScore] = useState(0);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const celebrateAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(isUnlocked ? 1 : 0)).current;
  const entranceAnim = useRef(new Animated.Value(isPlayable ? 1 : 0)).current;
  const [showBadge, setShowBadge] = useState(isUnlocked);
  const prevScoreRef = useRef(score);
  const isFirstPlayable = useRef(true);
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

  useEffect(() => {
    if (isFirstPlayable.current) {
      isFirstPlayable.current = false;
      return;
    }
    if (isPlayable) {
      Animated.timing(entranceAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [isPlayable, entranceAnim]);

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
  const isQuizDisabled = !isPlayable || quizOnCooldown;

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
        <Pressable style={styles.buttonFlex} onPress={handlePress} disabled={!isPlayable}>
          <Animated.View
            style={[
              styles.button,
              !isPlayable && styles.buttonDisabled,
              { transform: [{ scale: buttonScale }] },
            ]}
          >
            <View style={styles.buttonContent}>
              {!isPlayable && <Text style={styles.lockIcon}>🔒</Text>}
              <Text style={[styles.buttonText, !isPlayable && styles.buttonTextDisabled]}>
                Développer
              </Text>
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

export default function App() {
  const [scores, setScores] = useState(COUNTRIES.map(() => 0));
  // Pas de son pour l'instant : l'état et le bouton restent en place pour
  // brancher les effets sonores plus tard sans retoucher l'interface.
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleDevelop = (index) => {
    setScores((prev) => {
      const next = [...prev];
      next[index] += SCORE_INCREMENT;
      return next;
    });
  };

  const handleQuizCorrect = (index) => {
    setScores((prev) => {
      const next = [...prev];
      next[index] += QUIZ_BONUS;
      return next;
    });
  };

  const playableFlags = COUNTRIES.map(
    (_country, index) => index === 0 || scores[index - 1] >= getUnlockThreshold(COUNTRIES[index - 1])
  );

  const latestUnlockedIndex = COUNTRIES.reduce(
    (latest, _country, index) =>
      index > 0 && scores[index - 1] >= getUnlockThreshold(COUNTRIES[index - 1]) ? index : latest,
    null
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <WorldMapBackground unlockedFlags={playableFlags} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerSpacer} />
          <Text style={styles.title}>Conquer The World</Text>
          <Pressable
            onPress={() => setSoundEnabled((v) => !v)}
            style={styles.soundButton}
            hitSlop={8}
          >
            <Text style={styles.soundButtonText}>{soundEnabled ? '🔊' : '🔇'}</Text>
          </Pressable>
        </View>
        {COUNTRIES.map((country, index) => (
          <CountryCard
            key={country.id}
            country={country}
            allCountries={COUNTRIES}
            score={scores[index]}
            threshold={getUnlockThreshold(country)}
            isPlayable={playableFlags[index]}
            isUnlocked={index === latestUnlockedIndex}
            onDevelop={() => handleDevelop(index)}
            onQuizCorrect={() => handleQuizCorrect(index)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f5f9',
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f2f5f9',
    overflow: 'hidden',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerSpacer: {
    width: 36,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1c2733',
  },
  soundButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  soundButtonText: {
    fontSize: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  celebrateOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2e9e5b',
  },
  flagBackground: {
    position: 'absolute',
    right: -14,
    top: -24,
    fontSize: 100,
    opacity: 0.12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countryName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1c2733',
  },
  unlockedBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#2e9e5b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  criterion: {
    fontSize: 14,
    color: '#5b6b7c',
    marginTop: 4,
  },
  score: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e4e9ef',
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#2e5fa3',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  buttonFlex: {
    flex: 1,
  },
  button: {
    backgroundColor: '#2e5fa3',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  quizButton: {
    backgroundColor: '#7c5cbf',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#c3cad3',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  buttonTextDisabled: {
    color: '#7c8794',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 39, 51, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  modalFlag: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalPrompt: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c2733',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOption: {
    borderWidth: 1.5,
    borderColor: '#d7dee6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  modalOptionCorrect: {
    borderColor: '#2e9e5b',
    backgroundColor: '#e5f6ec',
  },
  modalOptionWrong: {
    borderColor: '#d94f3d',
    backgroundColor: '#fbe9e6',
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1c2733',
    textAlign: 'center',
  },
  modalOptionEmoji: {
    fontSize: 32,
  },
  modalResultText: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalResultCorrect: {
    color: '#2e9e5b',
  },
  modalResultWrong: {
    color: '#d94f3d',
  },
  detailCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
  },
  detailCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f2f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  detailCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5b6b7c',
  },
  detailFlag: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 4,
  },
  detailName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1c2733',
    textAlign: 'center',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
  },
  detailLabel: {
    fontSize: 14,
    color: '#5b6b7c',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c2733',
  },
  detailScore: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 17,
  },
});
