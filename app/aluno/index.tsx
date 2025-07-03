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

interface AvaliacaoRecente {
  id: string;
  titulo: string;
  nota?: number;
  dataFinalizacao?: Date;
}

interface Estatisticas {
  totalAvaliacoes: number;
  mediaNotas: number;
  melhorNota: number;
}

export default function AlunoHome() {
  const router = useRouter();
  const theme = useTheme();
  const [avaliacoesRecentes, setAvaliacoesRecentes] = useState<AvaliacaoRecente[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    totalAvaliacoes: 0,
    mediaNotas: 0,
    melhorNota: 0
  });
  const [loading, setLoading] = useState(true);
  const [aluno, setAluno] = useState<any>(null);

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

      // Busca avaliações recentes do aluno
      const q = query(
        collection(firestore, 'respostas'), 
        where('alunoId', '==', user.id),
        limit(10)
      );
      
      unsub = onSnapshot(q, (snap) => {
        const arr: AvaliacaoRecente[] = snap.docs.map((d) => {
          const rd: any = d.data();
          return {
            id: d.id,
            titulo: rd.provaTitulo || 'Prova',
            nota: rd.notaGeral,
            dataFinalizacao: rd.corrigidoEm ? new Date(rd.corrigidoEm.seconds * 1000) : undefined,
          };
        });
        
        // Ordena por data de correção (mais recentes primeiro) no lado do cliente
        const ordenadas = arr.sort((a, b) => {
          if (!a.dataFinalizacao && !b.dataFinalizacao) return 0;
          if (!a.dataFinalizacao) return 1;
          if (!b.dataFinalizacao) return -1;
          return b.dataFinalizacao.getTime() - a.dataFinalizacao.getTime();
        }).slice(0, 5); // Pega apenas as 5 mais recentes
        
        setAvaliacoesRecentes(ordenadas);

        // Calcula estatísticas
        const notas = ordenadas.filter(a => a.nota !== undefined).map(a => a.nota!);
        const total = ordenadas.length;
        const media = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
        const melhor = notas.length > 0 ? Math.max(...notas) : 0;

        setEstatisticas({
          totalAvaliacoes: total,
          mediaNotas: Math.round(media * 10) / 10,
          melhorNota: melhor
        });

        setLoading(false);
      });
    })();

    return () => unsub && unsub();
  }, []);

  function formatarData(data: Date) {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  if (loading) {
    return (
      <ThemedView style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <ThemedText style={[styles.loadingText, { color: theme.colors.text }]}>
          Carregando...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cabeçalho com saudação */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={[styles.title, { color: theme.colors.text }]}>
          Olá, {aluno?.nome || 'Aluno'}!
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.dark ? '#aaa' : '#666' }]}>
          Bem-vindo ao sistema de avaliações
        </ThemedText>
      </ThemedView>

      {/* Botão principal - Entrar em Sala */}
      <Pressable 
        style={[styles.primaryButton, { backgroundColor: theme.dark ? '#4a90e2' : '#0a7ea4' }]} 
        onPress={() => router.push('/aluno/entrar-sala')}
      >
        <Ionicons name="enter-outline" size={24} color="#fff" />
        <ThemedText style={styles.primaryButtonText}>
          Entrar em Sala de Prova
        </ThemedText>
        <ThemedText style={styles.primaryButtonSubtext}>
          Escaneie o QR Code ou digite o código da sala
        </ThemedText>
      </Pressable>

      {/* Estatísticas */}
      <ThemedView style={[styles.statsContainer, { backgroundColor: theme.dark ? '#1a1a1a' : '#f8f9fa' }]}>
        <ThemedText style={[styles.statsTitle, { color: theme.colors.text }]}>
          Suas Estatísticas
        </ThemedText>
        <ThemedView style={styles.statsGrid}>
          <ThemedView style={[styles.statCard, { backgroundColor: theme.dark ? '#2a2a2a' : '#fff' }]}>
            <Ionicons name="document-text" size={24} color="#0a7ea4" />
            <ThemedText style={[styles.statValue, { color: theme.colors.text }]}>
              {estatisticas.totalAvaliacoes}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.dark ? '#aaa' : '#666' }]}>
              Avaliações
            </ThemedText>
          </ThemedView>
          
          <ThemedView style={[styles.statCard, { backgroundColor: theme.dark ? '#2a2a2a' : '#fff' }]}>
            <Ionicons name="trending-up" size={24} color="#4caf50" />
            <ThemedText style={[styles.statValue, { color: theme.colors.text }]}>
              {estatisticas.mediaNotas}/10
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.dark ? '#aaa' : '#666' }]}>
              Média
            </ThemedText>
          </ThemedView>
          
          <ThemedView style={[styles.statCard, { backgroundColor: theme.dark ? '#2a2a2a' : '#fff' }]}>
            <Ionicons name="star" size={24} color="#ff9800" />
            <ThemedText style={[styles.statValue, { color: theme.colors.text }]}>
              {estatisticas.melhorNota}/10
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.dark ? '#aaa' : '#666' }]}>
              Melhor Nota
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      {/* Avaliações Recentes */}
      <ThemedView style={styles.recentSection}>
        <ThemedView style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Avaliações Recentes
          </ThemedText>
          <Pressable onPress={() => router.push('/aluno/historico')}>
            <ThemedText style={[styles.verTodas, { color: theme.dark ? '#4a90e2' : '#0a7ea4' }]}>
              Ver todas
            </ThemedText>
          </Pressable>
        </ThemedView>

        {avaliacoesRecentes.length > 0 ? (
          <FlatList
            data={avaliacoesRecentes}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <Pressable 
                onPress={() => router.push({ pathname: '/aluno/detalhe-resposta', params: { respostaId: item.id } } as any)}
              >
                <ThemedView style={[styles.avaliacaoCard, { backgroundColor: theme.dark ? '#1a1a1a' : '#f8f9fa' }]}>
                  <ThemedView style={styles.avaliacaoHeader}>
                    <ThemedText style={[styles.avaliacaoTitulo, { color: theme.colors.text }]}>
                      {item.titulo}
                    </ThemedText>
                    {item.nota !== undefined && (
                      <ThemedView style={[styles.notaBox, { backgroundColor: item.nota >= 7 ? '#4caf50' : item.nota >= 5 ? '#ff9800' : '#f44336' }]}>
                        <ThemedText style={styles.notaText}>
                          {item.nota}/10
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                  
                  {item.dataFinalizacao && (
                    <ThemedText style={[styles.avaliacaoData, { color: theme.dark ? '#aaa' : '#666' }]}>
                      Finalizada em {formatarData(item.dataFinalizacao)}
                    </ThemedText>
                  )}
                  
                  {item.nota === undefined && (
                    <ThemedText style={[styles.avaliacaoStatus, { color: theme.dark ? '#ff9800' : '#ff9800' }]}>
                      Aguardando correção
                    </ThemedText>
                  )}
                </ThemedView>
              </Pressable>
            )}
          />
        ) : (
          <ThemedView style={[styles.emptyState, { backgroundColor: theme.dark ? '#1a1a1a' : '#f8f9fa' }]}>
            <Ionicons name="document-text-outline" size={48} color={theme.dark ? '#666' : '#999'} />
            <ThemedText style={[styles.emptyText, { color: theme.dark ? '#aaa' : '#666' }]}>
              Nenhuma avaliação finalizada ainda
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.dark ? '#888' : '#999' }]}>
              Entre em uma sala de prova para começar
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: StatusBar.currentHeight,
  },
  header: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    flex: 1,
  },
  primaryButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  statsContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  recentSection: {
    padding: 16,
    flex: 1,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  verTodas: {
    fontSize: 14,
    fontWeight: '500',
  },
  avaliacaoCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  avaliacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  avaliacaoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  notaBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  notaText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  avaliacaoData: {
    fontSize: 14,
  },
  avaliacaoStatus: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
}); 