import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { Pressable, StatusBar, StyleSheet } from 'react-native';

export default function PerfilScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Meu Perfil</ThemedText>
      <ThemedText>Nome: João Silva</ThemedText>
      <ThemedText>E-mail: joao@example.com</ThemedText>
      <ThemedText>Cursos: Física, Química</ThemedText>

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