import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StatusBar, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function RelatoriosScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Relatórios e Estatísticas</ThemedText>

      <ScrollView contentContainerStyle={{ gap: 16, paddingVertical: 12 }}>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Média geral das turmas</ThemedText>
          <ThemedText>78%</ThemedText>
        </ThemedView>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Notas por aluno</ThemedText>
          <ThemedText>(gráfico placeholder)</ThemedText>
        </ThemedView>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Análise por pergunta</ThemedText>
          <ThemedText>Pergunta 1: 65% de acerto</ThemedText>
        </ThemedView>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Sugestões da IA</ThemedText>
          <ThemedText>Rever conteúdo de Relatividade</ThemedText>
        </ThemedView>
      </ScrollView>

      <Pressable style={styles.primaryButton} onPress={() => {}}>
        <ThemedText style={styles.buttonText}>Exportar como PDF</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: StatusBar.currentHeight,
  },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 