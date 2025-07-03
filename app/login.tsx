import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { loginUsuario } from '@/utils/auth';
import { useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  async function handleLogin() {
    setLoading(true);
    try {
      const user = await loginUsuario({ email, senha: password });
      if (user.role === 'professor') {
        router.push('/professor');
      } else {
        router.push('/aluno');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    AsyncStorage.getItem('usuarioLogado').then(data => {
      if (data) {
        const usuario = JSON.parse(data);
        console.log(usuario);
        if (usuario.role === 'professor') {
          router.push('/professor');
        } else {
          router.push('/aluno');
        }
      }
    });
  }, []);
  return (
    <ThemedView style={styles.container}>
      <Image source={require('@/assets/icons/logo.png')} style={[styles.logo, { tintColor: '#0a7ea4' }]} />
      <ThemedText type="title" style={styles.title}>Neurelix-Avaliação</ThemedText>
      <ThemedText type="title" style={styles.subtitle}>Acessar Plataforma</ThemedText>
      <TextInput
        placeholder="E-mail"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { backgroundColor: 'transparent' , color: theme.colors.text}]}
      />
      <TextInput
        placeholder="Senha"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={[styles.input, { backgroundColor: 'transparent' , color: theme.colors.text}]}
      />

      <Pressable style={styles.loginButton} onPress={() => handleLogin()} disabled={loading}>
        <ThemedText style={{ color: '#fff', fontWeight: '600' }}>{loading ? 'Entrando...' : 'Entrar'}</ThemedText>
      </Pressable>

      <TouchableOpacity onPress={() => router.push('/telas-extras/recuperar-senha')}>
        <ThemedText type="link">Esqueceu sua senha?</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/cadastro')} style={{ marginTop: 16 }}>
        <ThemedText type="link">Não possui conta? Cadastre-se</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
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
  },
  loginButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0a7ea4',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#0a7ea4',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  buttonText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
}); 