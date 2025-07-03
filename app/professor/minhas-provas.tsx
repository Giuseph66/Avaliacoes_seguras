import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StatusBar, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@react-navigation/native';

// Dados mockados para demonstração
const provasMock = [
  {
    id: '1',
    titulo: 'Avaliação de Matemática - 1º Bimestre',
    descricao: 'Prova sobre álgebra básica e equações do primeiro grau.',
    dataCriacao: '2024-01-15',
    totalQuestoes: 4,
    questoesObjetivas: 3,
    questoesDiscursivas: 1,
    status: 'publicada' as const,
  },
  {
    id: '2',
    titulo: 'Avaliação de História - Revolução Industrial',
    descricao: 'Prova sobre a Revolução Industrial e seus impactos.',
    dataCriacao: '2024-01-10',
    totalQuestoes: 6,
    questoesObjetivas: 4,
    questoesDiscursivas: 2,
    status: 'rascunho' as const,
  },
  {
    id: '3',
    titulo: 'Avaliação de Português - Literatura Moderna',
    descricao: 'Prova sobre literatura moderna brasileira.',
    dataCriacao: '2024-01-08',
    totalQuestoes: 5,
    questoesObjetivas: 2,
    questoesDiscursivas: 3,
    status: 'publicada' as const,
  },
];

export default function MinhasProvas() {
  const router = useRouter();
  const theme = useTheme();
  const [provas, setProvas] = useState(provasMock);

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-BR');
  }

  function getStatusColor(status: string) {
    return status === 'publicada' ? '#4CAF50' : '#FF9800';
  }

  function getStatusText(status: string) {
    return status === 'publicada' ? 'Publicada' : 'Rascunho';
  }

  function handleVisualizarProva(prova: any) {
    router.push('/professor/visualizar-prova');
  }

  function handleEditarProva(prova: any) {
    router.push('/professor/criar-avaliacao');
  }

  function handleExcluirProva(provaId: string) {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta prova? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            setProvas(prev => prev.filter(p => p.id !== provaId));
            Alert.alert('Sucesso', 'Prova excluída com sucesso!');
          }
        }
      ]
    );
  }

  function handleCompartilharProva(prova: any) {
    Alert.alert('Compartilhar', `Compartilhando prova: ${prova.titulo}`);
  }

  function renderProva({ item }: { item: any }) {
    return (
      <ThemedView style={[
        styles.provaCard,
        { 
          backgroundColor: theme.dark ? '#1a1a1a' : '#fff',
          borderColor: theme.dark ? '#333' : '#e0e0e0'
        }
      ]}>
        <ThemedView style={styles.provaHeader}>
          <ThemedView style={styles.provaInfo}>
            <ThemedText style={[
              styles.provaTitulo,
              { color: theme.colors.text }
            ]}>
              {item.titulo}
            </ThemedText>
            <ThemedText style={[
              styles.provaDescricao,
              { color: theme.dark ? '#ccc' : '#666' }
            ]}>
              {item.descricao}
            </ThemedText>
            <ThemedText style={[
              styles.provaData,
              { color: theme.dark ? '#aaa' : '#888' }
            ]}>
              Criada em: {formatarData(item.dataCriacao)}
            </ThemedText>
          </ThemedView>
          
          <ThemedView style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' }
          ]}>
            <ThemedText style={[
              styles.statusText,
              { color: getStatusColor(item.status) }
            ]}>
              {getStatusText(item.status)}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={[
          styles.provaStats,
          { backgroundColor: theme.dark ? '#2a2a2a' : '#f8f9fa' }
        ]}>
          <ThemedView style={styles.statItem}>
            <ThemedText style={[
              styles.statLabel,
              { color: theme.dark ? '#aaa' : '#666' }
            ]}>
              Total
            </ThemedText>
            <ThemedText style={[
              styles.statValue,
              { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
            ]}>
              {item.totalQuestoes}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.statItem}>
            <ThemedText style={[
              styles.statLabel,
              { color: theme.dark ? '#aaa' : '#666' }
            ]}>
              Objetivas
            </ThemedText>
            <ThemedText style={[
              styles.statValue,
              { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
            ]}>
              {item.questoesObjetivas}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.statItem}>
            <ThemedText style={[
              styles.statLabel,
              { color: theme.dark ? '#aaa' : '#666' }
            ]}>
              Discursivas
            </ThemedText>
            <ThemedText style={[
              styles.statValue,
              { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
            ]}>
              {item.questoesDiscursivas}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.provaActions}>
          <Pressable 
            style={[
              styles.actionButton, 
              styles.primaryAction,
              { backgroundColor: theme.dark ? '#4a90e2' : '#0a7ea4' }
            ]} 
            onPress={() => handleVisualizarProva(item)}
          >
            <Ionicons name="eye" size={16} color="#fff" />
            <ThemedText style={styles.actionButtonText}>Visualizar</ThemedText>
          </Pressable>

          <Pressable 
            style={[
              styles.actionButton, 
              styles.secondaryAction,
              { 
                borderColor: theme.dark ? '#444' : '#e0e0e0',
                backgroundColor: theme.dark ? '#2a2a2a' : 'transparent'
              }
            ]} 
            onPress={() => handleEditarProva(item)}
          >
            <Ionicons name="create" size={16} color={theme.dark ? '#4a90e2' : '#0a7ea4'} />
            <ThemedText style={[
              styles.actionButtonText, 
              { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
            ]}>
              Editar
            </ThemedText>
          </Pressable>

          <Pressable 
            style={[
              styles.actionButton, 
              styles.secondaryAction,
              { 
                borderColor: theme.dark ? '#444' : '#e0e0e0',
                backgroundColor: theme.dark ? '#2a2a2a' : 'transparent'
              }
            ]} 
            onPress={() => handleCompartilharProva(item)}
          >
            <Ionicons name="share" size={16} color={theme.dark ? '#aaa' : '#687076'} />
            <ThemedText style={[
              styles.actionButtonText, 
              { color: theme.dark ? '#aaa' : '#687076' }
            ]}>
              Compartilhar
            </ThemedText>
          </Pressable>

          <Pressable 
            style={[
              styles.actionButton, 
              styles.dangerAction,
              { 
                borderColor: theme.dark ? '#d32f2f' : '#ffcdd2',
                backgroundColor: theme.dark ? '#2a2a2a' : 'transparent'
              }
            ]} 
            onPress={() => handleExcluirProva(item.id)}
          >
            <Ionicons name="trash" size={16} color="#d32f2f" />
            <ThemedText style={[
              styles.actionButtonText, 
              { color: '#d32f2f' }
            ]}>
              Excluir
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[
      styles.container,
      { backgroundColor: theme.colors.background }
    ]}>
      <ThemedView style={[
        styles.header,
        { 
          borderBottomColor: theme.dark ? '#333' : '#e0e0e0',
          backgroundColor: theme.colors.background
        }
      ]}>
        <ThemedText type="title" style={{ color: theme.colors.text }}>Minhas Provas</ThemedText>
        <Pressable 
          style={[
            styles.addButton,
            { backgroundColor: theme.dark ? '#4a90e2' : '#0a7ea4' }
          ]}
          onPress={() => router.push('/professor/criar-avaliacao')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </ThemedView>

      {provas.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <Ionicons name="document-text" size={64} color={theme.dark ? '#555' : '#ccc'} />
          <ThemedText style={[
            styles.emptyTitle,
            { color: theme.dark ? '#ccc' : '#666' }
          ]}>
            Nenhuma prova criada
          </ThemedText>
          <ThemedText style={[
            styles.emptyDescription,
            { color: theme.dark ? '#aaa' : '#888' }
          ]}>
            Crie sua primeira prova clicando no botão + acima
          </ThemedText>
          <Pressable 
            style={[
              styles.primaryButton,
              { backgroundColor: theme.dark ? '#4a90e2' : '#0a7ea4' }
            ]}
            onPress={() => router.push('/professor/criar-avaliacao')}
          >
            <ThemedText style={styles.buttonText}>Criar Primeira Prova</ThemedText>
          </Pressable>
        </ThemedView>
      ) : (
        <FlatList
          data={provas}
          keyExtractor={(item) => item.id}
          renderItem={renderProva}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  provaCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  provaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  provaInfo: {
    flex: 1,
    marginRight: 12,
  },
  provaTitulo: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  provaDescricao: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  provaData: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  provaStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  provaActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  primaryAction: {
    // backgroundColor será definido dinamicamente
  },
  secondaryAction: {
    borderWidth: 1,
    // backgroundColor e borderColor serão definidos dinamicamente
  },
  dangerAction: {
    borderWidth: 1,
    // backgroundColor e borderColor serão definidos dinamicamente
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 