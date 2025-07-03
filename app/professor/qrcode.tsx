import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Clipboard, Pressable, Share, StatusBar, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function GerarQRCodeScreen() {
  const params = useLocalSearchParams<{ id: string; titulo?: string }>();
  const provaId = params.id ?? '0';
  const titulo = params.titulo ?? 'Avaliação';
  const url = `/aluno/responder-avaliacao?id=${provaId}`;
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  async function handleShare() {
    try {
      await Share.share({ message: `Acesse a prova "${titulo}": ${url}` });
    } catch (e) {
      console.log(e);
    }
  }

  function handleCopy() {
    Clipboard.setString(url);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ marginBottom: 8 }}>{titulo}</ThemedText>
      <ThemedText style={{ marginBottom: 24 }}>Código da avaliação: {provaId}</ThemedText>

      <ThemedView
        style={[styles.card, {
          backgroundColor: theme.background,
          borderColor: theme.icon,
        }]}
      >
        <QRCode value={url} size={260} color={theme.text} backgroundColor={theme.background} />
      </ThemedView>

      <ThemedText style={{ marginTop: 16, marginBottom: 8, textAlign: 'center' }}>
        Escaneie o QR-Code com o aplicativo do aluno para abrir a prova ou compartilhe o link abaixo.
      </ThemedText>

      <Pressable style={[styles.button, { backgroundColor: theme.background }]} onPress={handleShare}>
        <Ionicons name="share-social-outline" size={20} color="#fff" />
        <ThemedText style={[styles.buttonText , {color: theme.tint}]}>Compartilhar Link</ThemedText>
      </Pressable>

      <Pressable style={[styles.buttonSecondary, { borderColor: theme.tint }]} onPress={handleCopy}>
        <Ionicons name="copy-outline" size={20} color={theme.tint} />
        <ThemedText style={[styles.buttonText, { color: theme.tint }]}>Copiar Link</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    paddingTop: StatusBar.currentHeight,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    borderRadius: 16,
    elevation: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a7ea4',
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 