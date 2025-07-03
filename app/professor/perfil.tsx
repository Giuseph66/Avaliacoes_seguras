import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { Pressable, StatusBar, StyleSheet } from 'react-native';

export default function PerfilProfessor() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Perfil do Professor</ThemedText>
      <ThemedText>Nome: Prof. João Silva</ThemedText>
      <ThemedText>E-mail: joao.silva@example.com</ThemedText>
      <ThemedText>Departamento: Ciências Exatas</ThemedText>

      <ThemedText type="subtitle" style={{ marginTop: 16 }}>Preferências</ThemedText>
      <ThemedText>• Modo escuro</ThemedText>
      <ThemedText>• Notificações por e-mail</ThemedText>

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