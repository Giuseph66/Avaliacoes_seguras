import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet } from 'react-native';

export default function AtualizarAppScreen() {
  const theme = useTheme();
  const router = useRouter();

  const urlLoja = 'https://letmegooglethat.com/?q=Essa+versao+%C3%A9+de+teste+%2C+nao+tem+atualiza%C3%A7%C3%A3o+nao+%2C+%C3%A9+so+para+voce+nao+usar+sem+pagar'
  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <ThemedText type="title" style={[styles.title, { color: theme.colors.text }]}>Atualização Obrigatória</ThemedText>
      <ThemedText style={[styles.text, { color: theme.colors.text }]}>Uma nova versão do aplicativo está disponível.</ThemedText>
      <ThemedText style={[styles.text, { color: theme.colors.text }]}>Versão atual: <ThemedText style={{ fontWeight: 'bold' }}>{Constants.expoConfig?.version || 'N/A'}</ThemedText></ThemedText>
      <ThemedText style={[styles.text, { color: theme.colors.text }]}>Por favor, atualize para continuar usando o app.</ThemedText>
      <Pressable style={styles.button} onPress={() => Linking.openURL(urlLoja)}>
        <ThemedText style={styles.buttonText}>Baixar nova versão</ThemedText>
      </Pressable>
      <Pressable style={styles.retryButton} onPress={() => router.replace('/login')}>
        <ThemedText style={styles.retryText}>Já atualizei</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  retryText: {
    color: '#0a7ea4',
    fontWeight: 'bold',
    fontSize: 15,
  },
}); 