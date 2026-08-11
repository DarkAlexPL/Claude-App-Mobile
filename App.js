import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Animated, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const COUNTRIES = [
  { id: '1', name: 'France', area: '551 695 km²', flag: '🇫🇷' },
  { id: '2', name: 'Brésil', area: '8 515 767 km²', flag: '🇧🇷' },
  { id: '3', name: 'Japon', area: '377 975 km²', flag: '🇯🇵' },
  { id: '4', name: 'Australie', area: '7 692 024 km²', flag: '🇦🇺' },
  { id: '5', name: 'Égypte', area: '1 002 450 km²', flag: '🇪🇬' },
];

const SCORE_INCREMENT = 10;
const UNLOCK_THRESHOLD = 100;

function getScoreColor(score) {
  const ratio = Math.min(score, UNLOCK_THRESHOLD) / UNLOCK_THRESHOLD;
  if (ratio >= 0.7) return '#2e9e5b';
  if (ratio >= 0.3) return '#d98a1f';
  return '#5b6b7c';
}

function CountryCard({ country, score, isPlayable, isUnlocked, onDevelop }) {
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
    if (prev < UNLOCK_THRESHOLD && score >= UNLOCK_THRESHOLD) {
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
  }, [score, cardScale, celebrateAnim]);

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
    inputRange: [0, UNLOCK_THRESHOLD],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

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
      <Text style={styles.area}>Superficie : {country.area}</Text>
      <Text style={[styles.score, { color: getScoreColor(displayedScore) }]}>
        Score : {displayedScore}
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
    (latest, _country, index) => (index > 0 && scores[index - 1] >= UNLOCK_THRESHOLD ? index : latest),
    null
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Jeu de Géographie</Text>
        {COUNTRIES.map((country, index) => {
          const isPlayable = index === 0 || scores[index - 1] >= UNLOCK_THRESHOLD;
          return (
            <CountryCard
              key={country.id}
              country={country}
              score={scores[index]}
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
  area: {
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
