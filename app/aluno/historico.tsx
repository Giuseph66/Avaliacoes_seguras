import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { firestore } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StatusBar, StyleSheet } from 'react-native';

interface HistoricoItem {
  id: string;
  titulo: string;
  nota?: number;
  dataFinalizacao?: Date;
  corrigidoPorIA?: boolean;
}

export default function HistoricoScreen() {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aluno, setAluno] = useState<any>(null);
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    let unsub: any;

    (async () => {
      const data = await AsyncStorage.getItem('usuarioLogado');
      if (!data) {
        setLoading(false);
        return;
      }
      const user = JSON.parse(data);
      setAluno(user);
      
      const q = query(
        collection(firestore, 'respostas'), 
        where('alunoId', '==', user.id),
        limit(20)
      );
      
      unsub = onSnapshot(q, (snap) => {
        const arr: HistoricoItem[] = snap.docs.map((d) => {
          const rd: any = d.data();
          return {
            id: d.id,
            titulo: rd.provaTitulo || 'Prova',
            nota: rd.notaGeral,
            dataFinalizacao: rd.corrigidoEm ? new Date(rd.corrigidoEm.seconds * 1000) : undefined,
            corrigidoPorIA: rd.corrigidoPorIA || false,
          };
        });
        
        // Ordena por data de correção (mais recentes primeiro)
        const ordenadas = arr.sort((a, b) => {
          if (!a.dataFinalizacao && !b.dataFinalizacao) return 0;
          if (!a.dataFinalizacao) return 1;
          if (!b.dataFinalizacao) return -1;
          return b.dataFinalizacao.getTime() - a.dataFinalizacao.getTime();
        });
        
        setHistorico(ordenadas);
        setLoading(false);
      });
    })();

    return () => unsub && unsub();
  }, []);

  function formatarData(data: Date) {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <ThemedView style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.dark ? '#4a90e2' : '#0a7ea4'} />
        <ThemedText style={[styles.loadingText, { color: theme.colors.text }]}>
          Carregando histórico...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cabeçalho */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.dark ? '#333' : '#e0e0e0', backgroundColor: theme.dark ? '#1a1a1a' : '#fafafa' }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <ThemedText type="title" style={[styles.headerTitle, { color: theme.colors.text }]}>
          Histórico de Avaliações
        </ThemedText>
      </ThemedView>

      <FlatList
        data={historico}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <ThemedView style={[styles.emptyState, { backgroundColor: theme.dark ? '#1a1a1a' : '#fafafa' }]}>
            <Ionicons name="document-text-outline" size={48} color={theme.dark ? '#666' : '#999'} />
            <ThemedText style={[styles.emptyText, { color: theme.dark ? '#ccc' : '#666' }]}>
              Nenhuma avaliação finalizada ainda
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.dark ? '#888' : '#999' }]}>
              Entre em uma sala de prova para começar
            </ThemedText>
          </ThemedView>
        }
        renderItem={({ item }) => (
          <Pressable 
            onPress={() => router.push({ pathname: '/aluno/detalhe-resposta', params: { respostaId: item.id } } as any)}
          >
            <ThemedView style={[styles.card, { backgroundColor: theme.dark ? '#1a1a1a' : '#fafafa', borderColor: theme.dark ? '#333' : '#e0e0e0' }]}>
              <ThemedView style={styles.cardHeader}>
                <ThemedView style={styles.cardInfo}>
                  <ThemedText style={[styles.cardTitle, { color: theme.colors.text }]}>
                    {item.titulo}
                  </ThemedText>
                  <ThemedText style={[styles.cardDate, { color: theme.dark ? '#aaa' : '#666' }]}>
                    {item.dataFinalizacao ? formatarData(item.dataFinalizacao) : 'Aguardando correção'}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.cardActions}>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                </ThemedView>
              </ThemedView>
              
              {item.nota !== undefined ? (
                <ThemedView style={[styles.notaBox, { backgroundColor: item.nota >= 7 ? 'rgba(76,175,80,0.15)' : item.nota >= 5 ? 'rgba(255,152,0,0.15)' : 'rgba(244,67,54,0.15)' }]}>
                  <Ionicons 
                    name={item.nota >= 7 ? "checkmark-circle" : item.nota >= 5 ? "alert-circle" : "close-circle"} 
                    size={20} 
                    color={item.nota >= 7 ? '#4caf50' : item.nota >= 5 ? '#ff9800' : '#f44336'} 
                  />
                  <ThemedText style={[styles.notaText, { color: item.nota >= 7 ? '#4caf50' : item.nota >= 5 ? '#ff9800' : '#f44336' }]}>
                    Nota: {item.nota}/10
                  </ThemedText>
                </ThemedView>
              ) : (
                <ThemedView style={[styles.notaBox, { backgroundColor: 'rgba(255,152,0,0.15)' }]}>
                  <Ionicons name="time" size={20} color="#ff9800" />
                  <ThemedText style={[styles.notaText, { color: '#ff9800' }]}>
                    Aguardando correção
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  cardInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 8,
  },
  notaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  notaText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
}); 