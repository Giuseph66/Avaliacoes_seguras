import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { cadastrarUsuario } from '@/utils/auth';
import { useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CadastroScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [role, setRole] = useState<'professor' | 'aluno' | null>('aluno');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  async function handleRegister() {
    if (!role) {
      Alert.alert('Selecione seu perfil (Professor ou Aluno)');
      return;
    }
    if (!nome || !email || !senha || !confirmarSenha) {
      Alert.alert('Preencha todos os campos');
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert('As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      await cadastrarUsuario({ nome, email, senha, role });
      Alert.alert('Cadastro realizado com sucesso!');
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao cadastrar usuário.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Image source={require('@/assets/icons/logo.png')} style={[styles.logo, { tintColor: '#0a7ea4' }]} />
      <ThemedText type="title" style={styles.title}>Neurelix-Avaliação</ThemedText>
      <ThemedText type="title" style={styles.subtitle}>Criar Conta</ThemedText>
      <TextInput
        placeholder="Nome completo"
        placeholderTextColor="#888"
        value={nome}
        onChangeText={setNome}
        style={[styles.input, { backgroundColor: 'transparent' , color: theme.colors.text}]}
      />
      <TextInput
        placeholder="E-mail"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { backgroundColor: 'transparent' , color: theme.colors.text}]}
      />
      <TextInput
        placeholder="Senha"
        placeholderTextColor="#888"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
        style={[styles.input, { backgroundColor: 'transparent' , color: theme.colors.text}]}
      />
      <TextInput
        placeholder="Confirmar senha"
        placeholderTextColor="#888"
        secureTextEntry
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
        style={[styles.input, { backgroundColor: 'transparent' , color: theme.colors.text}]}
      />

      <ThemedText style={{ marginTop: 12 }}>Tipo de usuário</ThemedText>
      <ThemedView style={styles.roleRow}>
        <Pressable
          style={[styles.roleButton, role === 'professor' && styles.roleButtonActive]}
          onPress={() => setRole('professor')}>
          <ThemedText style={[styles.roleButtonText, role === 'professor' && styles.roleButtonTextActive]}>Professor</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.roleButton, role === 'aluno' && styles.roleButtonActive]}
          onPress={() => setRole('aluno')}>
          <ThemedText style={[styles.roleButtonText, role === 'aluno' && styles.roleButtonTextActive]}>Aluno</ThemedText>
        </Pressable>
      </ThemedView>

      <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
        <ThemedText style={styles.buttonText}>{loading ? 'Cadastrando...' : 'Cadastrar'}</ThemedText>
      </Pressable>

      <Pressable style={{ marginTop: 16 }} onPress={() => router.push('/login')}>
        <ThemedText type="link">Já tem conta? Fazer login</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 20,
  },
  logo: {
    width: '30%',
    height: '20%',
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#0a7ea4',
    color: '#fff',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  roleButtonText: {
    color: '#0a7ea4',
    fontWeight: '600',
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