import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Animated, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

// Triés par superficie croissante. areaKm2/population sont les valeurs brutes
// utilisées pour le calcul du score et des seuils ; area est la chaîne déjà
// formatée pour l'affichage (gère les décimales de Vatican/Monaco).
// Pour ajouter un pays : une entrée { id, name, area, areaKm2, population, flag }.
const COUNTRIES = [
  { id: 'va', name: 'Vatican', area: '0,44 km²', areaKm2: 0.44, population: 800, flag: '🇻🇦' },
  { id: 'mc', name: 'Monaco', area: '2,1 km²', areaKm2: 2.1, population: 39000, flag: '🇲🇨' },
  { id: 'mt', name: 'Malte', area: '316 km²', areaKm2: 316, population: 530000, flag: '🇲🇹' },
  { id: 'ad', name: 'Andorre', area: '468 km²', areaKm2: 468, population: 80000, flag: '🇦🇩' },
  { id: 'sg', name: 'Singapour', area: '728 km²', areaKm2: 728, population: 5900000, flag: '🇸🇬' },
  { id: 'lu', name: 'Luxembourg', area: '2 586 km²', areaKm2: 2586, population: 660000, flag: '🇱🇺' },
  { id: 'pt', name: 'Portugal', area: '92 212 km²', areaKm2: 92212, population: 10300000, flag: '🇵🇹' },
  { id: 'gr', name: 'Grèce', area: '131 957 km²', areaKm2: 131957, population: 10400000, flag: '🇬🇷' },
  { id: 'jp', name: 'Japon', area: '377 975 km²', areaKm2: 377975, population: 123000000, flag: '🇯🇵' },
  { id: 'fr', name: 'France', area: '551 695 km²', areaKm2: 551695, population: 68000000, flag: '🇫🇷' },
  { id: 'ke', name: 'Kenya', area: '580 367 km²', areaKm2: 580367, population: 55000000, flag: '🇰🇪' },
  { id: 'ua', name: 'Ukraine', area: '603 550 km²', areaKm2: 603550, population: 36000000, flag: '🇺🇦' },
  { id: 'eg', name: 'Égypte', area: '1 002 450 km²', areaKm2: 1002450, population: 112000000, flag: '🇪🇬' },
  { id: 'mx', name: 'Mexique', area: '1 964 375 km²', areaKm2: 1964375, population: 128000000, flag: '🇲🇽' },
  { id: 'ar', name: 'Argentine', area: '2 780 400 km²', areaKm2: 2780400, population: 46000000, flag: '🇦🇷' },
  { id: 'in', name: 'Inde', area: '3 287 263 km²', areaKm2: 3287263, population: 1428000000, flag: '🇮🇳' },
  { id: 'au', name: 'Australie', area: '7 692 024 km²', areaKm2: 7692024, population: 26000000, flag: '🇦🇺' },
  { id: 'br', name: 'Brésil', area: '8 515 767 km²', areaKm2: 8515767, population: 216000000, flag: '🇧🇷' },
  { id: 'cn', name: 'Chine', area: '9 596 961 km²', areaKm2: 9596961, population: 1410000000, flag: '🇨🇳' },
  { id: 'ca', name: 'Canada', area: '9 984 670 km²', areaKm2: 9984670, population: 39000000, flag: '🇨🇦' },
];

const SCORE_INCREMENT = 10;

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

function CountryCard({ country, score, threshold, isPlayable, isUnlocked, onDevelop }) {
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

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, friction: 3, tension: 140 }),
    ]).start();
    onDevelop();
  };

  const progressWidth = scoreAnim.interpolate({
    inputRange: [0, threshold],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const contributions = getContributions(country, displayedScore);

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
      <Pressable onPress={handlePress} disabled={!isPlayable}>
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
    </Animated.View>
  );
}

export default function App() {
  const [scores, setScores] = useState(COUNTRIES.map(() => 0));

  const handleDevelop = (index) => {
    setScores((prev) => {
      const next = [...prev];
      next[index] += SCORE_INCREMENT;
      return next;
    });
  };

  const latestUnlockedIndex = COUNTRIES.reduce(
    (latest, _country, index) =>
      index > 0 && scores[index - 1] >= getUnlockThreshold(COUNTRIES[index - 1]) ? index : latest,
    null
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Jeu de Géographie</Text>
        {COUNTRIES.map((country, index) => {
          const isPlayable = index === 0 || scores[index - 1] >= getUnlockThreshold(COUNTRIES[index - 1]);
          return (
            <CountryCard
              key={country.id}
              country={country}
              score={scores[index]}
              threshold={getUnlockThreshold(country)}
              isPlayable={isPlayable}
              isUnlocked={index === latestUnlockedIndex}
              onDevelop={() => handleDevelop(index)}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f5f9',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1c2733',
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
  button: {
    marginTop: 12,
    backgroundColor: '#2e5fa3',
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
});
