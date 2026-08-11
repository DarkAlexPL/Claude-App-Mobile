import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COUNTRIES = [
  { id: '1', name: 'France', area: '551 695 km²' },
  { id: '2', name: 'Brésil', area: '8 515 767 km²' },
  { id: '3', name: 'Japon', area: '377 975 km²' },
  { id: '4', name: 'Australie', area: '7 692 024 km²' },
  { id: '5', name: 'Égypte', area: '1 002 450 km²' },
];

const SCORE_INCREMENT = 10;
const UNLOCK_THRESHOLD = 100;

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
          const isUnlocked = index === latestUnlockedIndex;
          return (
            <View key={country.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.countryName}>{country.name}</Text>
                {isUnlocked && <Text style={styles.unlockedBadge}>Débloqué !</Text>}
              </View>
              <Text style={styles.area}>Superficie : {country.area}</Text>
              <Text style={styles.score}>Score : {scores[index]}</Text>
              <TouchableOpacity
                style={[styles.button, !isPlayable && styles.buttonDisabled]}
                onPress={() => handleDevelop(index)}
                disabled={!isPlayable}
              >
                <Text style={[styles.buttonText, !isPlayable && styles.buttonTextDisabled]}>
                  Développer
                </Text>
              </TouchableOpacity>
            </View>
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
