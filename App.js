import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
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

function CountryCard({ country, score, isPlayable, isUnlocked, onDevelop }) {
  const scoreScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const badgeAnim = useRef(new Animated.Value(isUnlocked ? 1 : 0)).current;
  const [showBadge, setShowBadge] = useState(isUnlocked);
  const isFirstScore = useRef(true);

  useEffect(() => {
    if (isFirstScore.current) {
      isFirstScore.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(scoreScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.spring(scoreScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  }, [score, scoreScale]);

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

  const animatePress = (toValue) => {
    Animated.spring(buttonScale, { toValue, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };

  return (
    <View style={styles.card}>
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
      <Animated.Text style={[styles.score, { transform: [{ scale: scoreScale }] }]}>
        Score : {score}
      </Animated.Text>
      <Pressable
        onPressIn={() => isPlayable && animatePress(0.94)}
        onPressOut={() => isPlayable && animatePress(1)}
        onPress={onDevelop}
        disabled={!isPlayable}
      >
        <Animated.View
          style={[
            styles.button,
            !isPlayable && styles.buttonDisabled,
            { transform: [{ scale: buttonScale }] },
          ]}
        >
          <Text style={[styles.buttonText, !isPlayable && styles.buttonTextDisabled]}>
            Développer
          </Text>
        </Animated.View>
      </Pressable>
    </View>
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
    color: '#2e5fa3',
    marginTop: 8,
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
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  buttonTextDisabled: {
    color: '#7c8794',
  },
});
