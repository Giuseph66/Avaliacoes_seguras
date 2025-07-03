import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { firestore } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet } from 'react-native';

export default function SalaReflexao() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [aluno, setAluno] = useState<any>(null);
  const [waiting, setWaiting] = useState(true);

  // Busca aluno logado
  useEffect(() => {
    AsyncStorage.getItem('usuarioLogado').then((data) => {
      if (data) {
        setAluno(JSON.parse(data));
      } else {
        router.replace('/login' as any);
      }
    });
  }, []);

  // Listener da sala para verificar liberação
  useEffect(() => {
    if (!params.salaId || !aluno) return;
    const alunoDoc = doc(firestore, 'salas', String(params.salaId), 'alunos', aluno.id);
    const unsub = onSnapshot(alunoDoc, (snap) => {
      if (!snap.exists() || snap.data()?.status !== 'fora_sala') {
        // Professor removeu status – voltar para sala de espera
        setDoc(alunoDoc, { id: aluno.id, nome: aluno.nome, status: 'espera' });
        router.replace({ pathname: '/aluno/sala-espera', params: { salaId: params.salaId } } as any);
      }
    });
    return () => unsub();
  }, [params.salaId, aluno?.id]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Ionicons name="alert" size={64} color={theme.colors.text} style={{ marginBottom: 16 }} />
      <ThemedText type="title" style={{ color: theme.colors.text, marginBottom: 12 }}>Sala de Reflexão</ThemedText>
      <ThemedText style={{ color: theme.colors.text, textAlign: 'center', marginBottom: 24 }}>
        Seu acesso à prova foi suspenso pelo sistema. Aguarde o professor liberá-lo para voltar.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: StatusBar.currentHeight,
  },
}); 