import { firestore } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode as atob } from 'base-64';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Image as RNImage, StatusBar, StyleSheet, TextInput } from 'react-native';

import { ImageSelector } from '@/components/ImageSelector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Questao } from '@/types/avaliacao';
import { salvarProva } from '@/utils/prova';
import { useProvaStore } from '@/utils/provaStore';
import { useTheme } from '@react-navigation/native';

export default function CriarAvaliacao() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const [novaQuestao, setNovaQuestao] = useState('');
  const [tipoQuestao, setTipoQuestao] = useState<'objetiva' | 'discursiva'>('objetiva');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [altText, setAltText] = useState('');
  const [respostaCorreta, setRespostaCorreta] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isAddingAlternative, setIsAddingAlternative] = useState(false);
  
  // Estados para edição de alternativa
  const [editingAltIndex, setEditingAltIndex] = useState<number | null>(null);
  const [editingAltText, setEditingAltText] = useState('');
  const [modalAltVisible, setModalAltVisible] = useState(false);

  // Usar o store global
  const { 
    titulo, 
    descricao, 
    questoes, 
    setTitulo, 
    setDescricao, 
    setQuestoes,
    addQuestao,
    updateQuestao,
    removeQuestao
  } = useProvaStore();

  const [professor, setProfessor] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('usuarioLogado').then(data => {
      if (data) {
        const usuario = JSON.parse(data);
        console.log(usuario);
        setProfessor(usuario);
      }
    });
    // Se for edição, buscar prova
    if (params.id) {
      (async () => {
        const ref = doc(firestore, 'provas', String(params.id));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          try {
            const decrypted = atob(snap.data().provaCriptografada);
            const prova = JSON.parse(decrypted);
            setTitulo(prova.titulo);
            setDescricao(prova.descricao);
            setQuestoes(prova.questoes);
          } catch (e) {
            Alert.alert('Erro', 'Não foi possível carregar a prova para edição.');
          }
        }
      })();
    }
  }, [params.id]);

  function adicionarQuestao() {
    if (!novaQuestao.trim()) return;
    setIsAddingQuestion(true);
    
    const novaQuestaoObj: Questao = {
      id: Date.now().toString(),
      texto: novaQuestao.trim(),
      tipo: tipoQuestao,
      dificuldade: '',
      alternativas: [],
      respostaCorreta: tipoQuestao === 'discursiva' ? '' : undefined
    };
    
    setTimeout(() => {
      addQuestao(novaQuestaoObj);
      setNovaQuestao('');
      setIsAddingQuestion(false);
    }, 500);
  }

  function removerQuestao(index: number) {
    Alert.alert(
      'Confirmar remoção',
      'Tem certeza que deseja remover esta questão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive',
          onPress: () => {
            removeQuestao(index);
            Alert.alert('Sucesso', 'Questão removida com sucesso!');
          }
        }
      ]
    );
  }

  function getTipoText(tipo: string) {
    return tipo === 'objetiva' ? 'Objetiva' : 'Discursiva';
  }

  function getAlternativaCorreta(questao: Questao) {
    if (questao.tipo === 'objetiva') {
      const correta = questao.alternativas.find(alt => alt.correta);
      return correta ? String.fromCharCode(65 + questao.alternativas.indexOf(correta)) : 'N/A';
    }
    return null;
  }

  async function publicarAvaliacao() {
    if (!professor) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }
    if (questoes.length === 0 || !titulo || !descricao) {
      Alert.alert('Aviso', 'Adicione um título, uma descrição e pelo menos uma questão antes de publicar a avaliação.');
      return;
    }
    setIsPublishing(true);
    try {
      const prova = {
        titulo,
        descricao,
        questoes
      };
      if (params.id) {
        // Edição: sobrescrever documento
        const dadosProva = JSON.stringify(prova);
        const provaCriptografada = require('base-64').encode(dadosProva);
        await setDoc(doc(firestore, 'provas', String(params.id)), {
          provaCriptografada,
          professor,
          criadoEm: new Date()
        });
        Alert.alert('Sucesso', 'Avaliação editada com sucesso!');
      } else {
        await salvarProva({ prova, professor });
        Alert.alert('Sucesso', 'Avaliação publicada com sucesso!');
      }
      limparAvaliacao();
      router.back();
    } catch (error) {
      console.error('Erro ao publicar avaliação:', error);
      Alert.alert('Erro', 'Não foi possível publicar a avaliação. Tente novamente.');
    } finally {
      setIsPublishing(false);
    }
  }
  const limparAvaliacao = () => {
    Alert.alert(
      'Confirmar limpeza',
      'Tem certeza que deseja limpar a avaliação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar', style: 'destructive', onPress: () => {
    setTitulo('');
    setDescricao('');
    setQuestoes([]);
  }}]
    );
  }
  const visualizarAvaliacao = () => {
    const prova = {
      titulo,
      descricao,
      questoes
    }
    if (questoes.length > 0 && titulo && descricao) {
      router.push('/professor/visualizar-prova');
    } else {
      Alert.alert('Aviso', 'Adicione um título e uma descrição antes de visualizar a avaliação.');
    }
  }
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0a7ea4" />
        </Pressable>
        <ThemedText type="title">Criar Avaliação</ThemedText>
        <Pressable onPress={limparAvaliacao}>
          <Ionicons name="trash" size={24} color="#0a7ea4" />
        </Pressable>
      </ThemedView>
      
      <TextInput
        placeholder="Título da avaliação"
        placeholderTextColor="#888"
        value={titulo}
        onChangeText={setTitulo}
        style={[styles.input, { color: theme.colors.text }]}
      />
      <TextInput
        placeholder="Descrição ou instruções"
        placeholderTextColor="#888"
        value={descricao}
        onChangeText={setDescricao}
        style={[styles.input, { height: 80, color: theme.colors.text }]}
        multiline
      />

      <ThemedText style={{ marginTop: 12 }}>Questões</ThemedText>
      <FlatList
        data={questoes}
        keyExtractor={(q) => q.id}
        contentContainerStyle={{ gap: 8, paddingBottom: 100 }}
        renderItem={({ item, index }) => (
          <ThemedView style={styles.card}>
            <Pressable
              style={styles.cardContent}
              onPress={() => {
                setEditingIndex(index);
                setModalVisible(true);
              }}>
              <ThemedView style={styles.cardInfo}>
                <ThemedText style={styles.questionText}>{index + 1}. {item.texto}</ThemedText>
                
                {/* Imagem da questão */}
                {item.imagem && (
                  <RNImage source={{ uri: item.imagem }} style={styles.questionImage} resizeMode="cover" />
                )}
                
                <ThemedText style={{ fontSize: 12, color: '#687076', marginTop: 4 }}>
                  Tipo: {getTipoText(item.tipo)}
                </ThemedText>
                {item.tipo === 'objetiva' && (
                  <ThemedText style={{ fontSize: 12, color: '#687076' }}>
                    Alternativas: {item.alternativas.length} | Correta: {getAlternativaCorreta(item)}
                  </ThemedText>
                )}
                {item.tipo === 'discursiva' && item.respostaCorreta && (
                  <ThemedText style={{ fontSize: 12, color: '#687076' }}>
                    Resposta: {item.respostaCorreta.substring(0, 50)}...
                  </ThemedText>
                )}
              </ThemedView>
              
              <ThemedView style={styles.cardActions}>                
                <Pressable
                  style={styles.actionButton}
                  onPress={() => removerQuestao(index)}>
                  <Ionicons name="trash" size={16} color="#d32f2f" />
                </Pressable>
              </ThemedView>
            </Pressable>
          </ThemedView>
        )}
        ListEmptyComponent={<ThemedText>Nenhuma questão adicionada.</ThemedText>}
      />

      {/* Botão flutuante para adicionar questão */}
      <Pressable 
        style={[
          styles.fab,
          { backgroundColor: theme.dark ? '#4a90e2' : '#0a7ea4' }
        ]} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      {/* Modal para adicionar nova questão */}
      <Modal visible={modalVisible && editingIndex === null} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <ThemedView style={styles.modalContainer}>
          <ThemedText type="title">Nova Questão</ThemedText>
          
          {/* Seleção do tipo de questão */}
          <ThemedView style={styles.tipoContainer}>
            <Pressable 
              style={[
                styles.tipoButton, 
                tipoQuestao === 'objetiva' && styles.tipoButtonActive
              ]}
              onPress={() => setTipoQuestao('objetiva')}
            >
              <ThemedText style={[
                styles.tipoButtonText,
                tipoQuestao === 'objetiva' && styles.tipoButtonTextActive
              ]}>
                Objetiva
              </ThemedText>
            </Pressable>
            <Pressable 
              style={[
                styles.tipoButton, 
                tipoQuestao === 'discursiva' && styles.tipoButtonActive
              ]}
              onPress={() => setTipoQuestao('discursiva')}
            >
              <ThemedText style={[
                styles.tipoButtonText,
                tipoQuestao === 'discursiva' && styles.tipoButtonTextActive
              ]}>
                Discursiva
              </ThemedText>
            </Pressable>
          </ThemedView>

          <TextInput
            placeholder="Texto da nova questão"
            placeholderTextColor="#888"
            value={novaQuestao}
            onChangeText={setNovaQuestao}
            style={[styles.input, { color: theme.colors.text }]}
          />

          <Pressable 
            style={[
              styles.primaryButton, 
              { marginTop: 16 },
              isAddingQuestion && styles.disabledButton
            ]} 
            onPress={adicionarQuestao}
            disabled={isAddingQuestion}
          >
            <ThemedText style={styles.buttonText}>
              {isAddingQuestion ? 'Adicionando...' : 'Adicionar questão'}
            </ThemedText>
          </Pressable>

          <Pressable 
            style={[styles.secondaryButton, { marginTop: 8 }]} 
            onPress={() => setModalVisible(false)}
          >
            <ThemedText style={styles.buttonText}>Cancelar</ThemedText>
          </Pressable>
        </ThemedView>
      </Modal>

      {/* Modal de edição de questão existente */}
      {editingIndex !== null && (
        <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <ThemedView style={styles.modalContainer}>
            <ThemedText type="title">Editar Questão</ThemedText>
            
            {/* Seleção do tipo de questão no modal */}
            <ThemedView style={styles.tipoContainer}>
              <Pressable 
                style={[
                  styles.tipoButton, 
                  questoes[editingIndex].tipo === 'objetiva' && styles.tipoButtonActive
                ]}
                onPress={() => {
                  const questaoAtualizada = { ...questoes[editingIndex] };
                  questaoAtualizada.tipo = 'objetiva';
                  questaoAtualizada.respostaCorreta = undefined;
                  updateQuestao(editingIndex, questaoAtualizada);
                }}
              >
                <ThemedText style={[
                  styles.tipoButtonText,
                  questoes[editingIndex].tipo === 'objetiva' && styles.tipoButtonTextActive
                ]}>
                  Objetiva
                </ThemedText>
              </Pressable>
              <Pressable 
                style={[
                  styles.tipoButton, 
                  questoes[editingIndex].tipo === 'discursiva' && styles.tipoButtonActive
                ]}
                onPress={() => {
                  const questaoAtualizada = { ...questoes[editingIndex] };
                  questaoAtualizada.tipo = 'discursiva';
                  questaoAtualizada.alternativas = [];
                  updateQuestao(editingIndex, questaoAtualizada);
                }}
              >
                <ThemedText style={[
                  styles.tipoButtonText,
                  questoes[editingIndex].tipo === 'discursiva' && styles.tipoButtonTextActive
                ]}>
                  Discursiva
                </ThemedText>
              </Pressable>
            </ThemedView>

            <TextInput
              value={questoes[editingIndex].texto}
              onChangeText={(text) => {
                const questaoAtualizada = { ...questoes[editingIndex] };
                questaoAtualizada.texto = text;
                updateQuestao(editingIndex, questaoAtualizada);
              }}
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Texto da questão"
              placeholderTextColor="#888"
            />

            {/* Seletor de imagem para a questão */}
            <ImageSelector
              imageUri={questoes[editingIndex].imagem}
              onImageSelected={(uri) => {
                const questaoAtualizada = { ...questoes[editingIndex] };
                questaoAtualizada.imagem = uri;
                updateQuestao(editingIndex, questaoAtualizada);
              }}
              onImageRemoved={() => {
                const questaoAtualizada = { ...questoes[editingIndex] };
                questaoAtualizada.imagem = undefined;
                updateQuestao(editingIndex, questaoAtualizada);
              }}
              placeholder="Adicionar imagem à questão"
            />

            {questoes[editingIndex].tipo === 'objetiva' && (
              <>
                <ThemedText style={{ marginTop: 16 }}>Alternativas</ThemedText>
                <FlatList
                  data={questoes[editingIndex].alternativas}
                  keyExtractor={(a) => a.id}
                  contentContainerStyle={{ gap: 8 }}
                  renderItem={({ item, index: ai }) => (
                    <ThemedView style={[styles.altCard, item.correta && { borderColor: '#0a7ea4' }]}>
                      <Pressable
                        style={styles.altCardContent}
                        onPress={() => {
                          const questaoAtualizada = { ...questoes[editingIndex] };
                          questaoAtualizada.alternativas = questaoAtualizada.alternativas.map((alt, i) => ({ ...alt, correta: i === ai }));
                          updateQuestao(editingIndex, questaoAtualizada);
                        }}>
                        <ThemedText>{String.fromCharCode(65 + ai)}) {item.texto}</ThemedText>
                        {item.correta && <Ionicons name="checkmark-circle" size={20} color="#0a7ea4" />}
                      </Pressable>
                      
                      {/* Imagem da alternativa */}
                      {item.imagem && (
                        <RNImage source={{ uri: item.imagem }} style={styles.altImage} resizeMode="cover" />
                      )}
                      
                      <ThemedView style={styles.altCardActions}>
                        <Pressable
                          style={styles.altActionButton}
                          onPress={() => {
                            setEditingAltIndex(ai);
                            setEditingAltText(item.texto);
                            setModalAltVisible(true);
                          }}>
                          <Ionicons name="create" size={16} color="#0a7ea4" />
                        </Pressable>
                        
                        <Pressable
                          style={styles.altActionButton}
                          onPress={() => {
                            const questaoAtualizada = { ...questoes[editingIndex] };
                            questaoAtualizada.alternativas = questaoAtualizada.alternativas.filter((_, i) => i !== ai);
                            updateQuestao(editingIndex, questaoAtualizada);
                          }}>
                          <Ionicons name="trash" size={16} color="#d32f2f" />
                        </Pressable>
                      </ThemedView>
                    </ThemedView>
                  )}
                  ListEmptyComponent={<ThemedText>Nenhuma alternativa.</ThemedText>}
                />

                <TextInput
                  placeholder="Nova alternativa"
                  value={altText}
                  placeholderTextColor="#888"
                  onChangeText={setAltText}
                  style={[styles.input, { marginTop: 12, color: theme.colors.text }]}
                />
                <Pressable
                  style={[
                    styles.secondaryButton, 
                    { marginTop: 8 },
                    isAddingAlternative && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (!altText.trim()) return;
                    setIsAddingAlternative(true);
                    setTimeout(() => {
                      const questaoAtualizada = { ...questoes[editingIndex] };
                      questaoAtualizada.alternativas.push({ 
                        id: Date.now().toString(), 
                        texto: altText.trim(), 
                        correta: questaoAtualizada.alternativas.length === 0 
                      });
                      updateQuestao(editingIndex, questaoAtualizada);
                      setAltText('');
                      setIsAddingAlternative(false);
                    }, 300);
                  }}
                  disabled={isAddingAlternative}
                >
                  <ThemedText style={styles.buttonText}>
                    {isAddingAlternative ? 'Adicionando...' : 'Adicionar alternativa'}
                  </ThemedText>
                </Pressable>
              </>
            )}

            {questoes[editingIndex].tipo === 'discursiva' && (
              <>
                <ThemedText style={{ marginTop: 16 }}>Resposta Correta (para IA)</ThemedText>
                <TextInput
                  placeholder="Digite a resposta correta esperada"
                  value={questoes[editingIndex].respostaCorreta || ''}
                  placeholderTextColor="#888"
                  onChangeText={(text) => {
                    const questaoAtualizada = { ...questoes[editingIndex] };
                    questaoAtualizada.respostaCorreta = text;
                    updateQuestao(editingIndex, questaoAtualizada);
                  }}
                  style={[styles.input, { height: 100, color: theme.colors.text }]}
                  multiline
                />
              </>
            )}

            <Pressable style={[styles.primaryButton, { marginTop: 16 }]} onPress={() => setModalVisible(false)}>
              <ThemedText style={styles.buttonText}>Concluir</ThemedText>
            </Pressable>
          </ThemedView>
        </Modal>
      )}

      {/* Modal de edição de alternativa */}
      {editingAltIndex !== null && editingIndex !== null && (
        <Modal visible={modalAltVisible} animationType="slide" onRequestClose={() => setModalAltVisible(false)}>
          <ThemedView style={styles.modalAltContainer}>
            <ThemedText type="title">Editar Alternativa</ThemedText>
            
            <TextInput
              value={editingAltText}
              onChangeText={setEditingAltText}
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Texto da alternativa"
              placeholderTextColor="#888"
            />

            {/* Seletor de imagem para a alternativa */}
            <ImageSelector
              imageUri={questoes[editingIndex].alternativas[editingAltIndex]?.imagem}
              onImageSelected={(uri) => {
                if (editingIndex !== null && editingAltIndex !== null) {
                  const questaoAtualizada = { ...questoes[editingIndex] };
                  questaoAtualizada.alternativas = questaoAtualizada.alternativas.map((alt, i) => 
                    i === editingAltIndex ? { ...alt, imagem: uri } : alt
                  );
                  updateQuestao(editingIndex, questaoAtualizada);
                }
              }}
              onImageRemoved={() => {
                if (editingIndex !== null && editingAltIndex !== null) {
                  const questaoAtualizada = { ...questoes[editingIndex] };
                  questaoAtualizada.alternativas = questaoAtualizada.alternativas.map((alt, i) => 
                    i === editingAltIndex ? { ...alt, imagem: undefined } : alt
                  );
                  updateQuestao(editingIndex, questaoAtualizada);
                }
              }}
              placeholder="Adicionar imagem à alternativa"
            />

            <ThemedView style={styles.modalAltActions}>
              <Pressable 
                style={[styles.secondaryButton, { flex: 1, marginRight: 8 }]} 
                onPress={() => setModalAltVisible(false)}
              >
                <ThemedText style={styles.buttonText}>Cancelar</ThemedText>
              </Pressable>
              
              <Pressable 
                style={[styles.primaryButton, { flex: 1 }]} 
                onPress={() => {
                  if (editingAltText.trim() && editingIndex !== null && editingAltIndex !== null) {
                    const questaoAtualizada = { ...questoes[editingIndex] };
                    questaoAtualizada.alternativas = questaoAtualizada.alternativas.map((alt, i) => 
                      i === editingAltIndex ? { ...alt, texto: editingAltText.trim() } : alt
                    );
                    updateQuestao(editingIndex, questaoAtualizada);
                    setModalAltVisible(false);
                    setEditingAltIndex(null);
                    setEditingAltText('');
                  }
                }}
              >
                <ThemedText style={styles.buttonText}>Salvar</ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        </Modal>
      )}

      <Pressable 
        style={[
          styles.secondaryButton, 
          { marginTop: 8 },
          questoes.length === 0 && styles.disabledButton
        ]} 
        onPress={visualizarAvaliacao}
        disabled={questoes.length === 0}
      >
        <ThemedText style={styles.buttonText}>
          Visualizar Prova Completa
        </ThemedText>
      </Pressable>

      <Pressable 
        style={[
          styles.fab, 
          { bottom: 230},
          { backgroundColor: theme.dark ? '#9c27b0' : '#9c27b0' }
        ]} 
        onPress={() => router.push('/professor/gerar-questoes-ia')}
      >
        <Ionicons name="sparkles" size={20} color="#fff"/>
      </Pressable>

      <ThemedView style={styles.buttonContainer}>
        <Pressable 
          style={[
            styles.secondaryButton, 
            { flex: 1 },
            (isGeneratingPDF || isPublishing) && styles.disabledButton
          ]} 
          onPress={() => router.back()}
          disabled={isGeneratingPDF || isPublishing}
        >
          <ThemedText style={styles.buttonText}>Cancelar</ThemedText>
        </Pressable>
        <Pressable 
          style={[
            styles.primaryButton, 
            { flex: 1, marginLeft: 8 },
            isPublishing && styles.disabledButton
          ]} 
          onPress={publicarAvaliacao}
          disabled={isPublishing}
        >
          <ThemedText style={styles.buttonText}>
            {isPublishing ? 'Publicando...' : 'Publicar avaliação'}
          </ThemedText>
        </Pressable>
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  questionImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  tipoContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  tipoButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  tipoButtonActive: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  tipoButtonText: {
    fontWeight: '600',
    color: '#687076',
  },
  tipoButtonTextActive: {
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#687076',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    paddingTop: StatusBar.currentHeight,
  },
  altCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  altCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  altCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  altActionButton: {
    padding: 8,
    borderRadius: 4,
  },
  modalAltContainer: {
    flex: 1,
    padding: 16,
    paddingTop: StatusBar.currentHeight,
  },
  modalAltActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  altImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 150,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
  },
  questionText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'justify',
    flexWrap: 'wrap',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin:10,
  },
}); 