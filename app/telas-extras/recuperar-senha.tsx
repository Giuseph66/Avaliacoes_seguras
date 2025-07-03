import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, TextInput } from 'react-native';

import InfoModal from '@/components/InfoModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function RecuperarSenhaScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  function handleRecuperar() {
    if (!email) {
      Alert.alert('Digite seu e-mail');
      return;
    }
    // Aqui chamaria API para enviar link ou código.
    setModalVisible(true);
  }

  return (
    <ThemedView style={styles.container}>
      <Image source={require('@/assets/icons/logo.png')} style={[styles.logo, { tintColor: '#0a7ea4' }]} />
      <ThemedText type="title" style={styles.title}>Neurelix-Avaliação</ThemedText>
      <ThemedText type="title" style={styles.subtitle}>Recuperar Senha</ThemedText>
      <ThemedText style={{ textAlign: 'center', marginBottom: 16 }}>
        Informe seu e-mail cadastrado. Enviaremos instruções de recuperação.
      </ThemedText>
      <TextInput
        placeholder="E-mail"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <Pressable style={styles.primaryButton} onPress={handleRecuperar}>
        <ThemedText style={styles.buttonText}>Enviar instruções</ThemedText>
      </Pressable>

      <Pressable style={{ marginTop: 24 }} onPress={() => router.back()}>
        <ThemedText type="link">Voltar ao login</ThemedText>
      </Pressable>

      <InfoModal
        visible={modalVisible}
        title="E-mail enviado!"

        onClose={() => {
          setModalVisible(false);
          router.back();
        }}>
        <ThemedText>
          Se o e-mail informado estiver cadastrado, enviaremos um link para redefinição de senha.
          Verifique sua caixa de entrada e spam.
        </ThemedText>
      </InfoModal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logo: {
    width: '30%',
    height: '20%',
    alignSelf: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 