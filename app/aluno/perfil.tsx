import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { Pressable, StatusBar, StyleSheet } from 'react-native';

export default function PerfilAluno() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Meu Perfil</ThemedText>
      <ThemedText>Nome: Maria Oliveira</ThemedText>
      <ThemedText>E-mail: maria.oliveira@example.com</ThemedText>
      <ThemedText>Turma: 3º Ano B</ThemedText>

      <ThemedText type="subtitle" style={{ marginTop: 16 }}>Estatísticas</ThemedText>
      <ThemedText>• Média Geral: 8,4</ThemedText>
      <ThemedText>• Avaliações concluídas: 12</ThemedText>

      <Pressable style={styles.primaryButton} onPress={() => router.replace('/login')}>
        <ThemedText style={styles.buttonText}>Sair</ThemedText>
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
  primaryButton: {
    backgroundColor: '#687076',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 