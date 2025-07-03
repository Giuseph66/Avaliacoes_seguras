import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StatusBar, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { GeracaoIA, Questao } from '@/types/avaliacao';
import { gerarQuestoesIA } from '@/utils/ia';
import { useProvaStore } from '@/utils/provaStore';
import { useTheme } from '@react-navigation/native';

export default function GerarQuestoesIA() {
  const router = useRouter();
  const theme = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [questoesGeradas, setQuestoesGeradas] = useState<Questao[]>([]);
  
  // Configuração da geração
  const [configuracao, setConfiguracao] = useState<GeracaoIA>({
    materia: '',
    tema: '',
    nivel: 'medio',
    quantidade: '',
    tipoQuestao: 'mista',
    instrucoes: ''
  });

  // Usar o store global
  const { addQuestao } = useProvaStore();

  async function gerarQuestoesIAHandler() {
    if (!configuracao.materia.trim() || !configuracao.tema.trim()) {
      Alert.alert('Aviso', 'Preencha a matéria e o tema antes de gerar as questões.');
      return;
    }

    setIsGenerating(true);
    try {
      // Substitua pela sua chave real da API do Google
      const key_google = 'AIzaSyD8AUUxeuO9Df465lJmy0oBvvg7rRtlenA'; // TODO: Adicionar chave real
      
      const questoesIA = await gerarQuestoesIA(
        configuracao.materia,
        configuracao.tema,
        configuracao.nivel,
        parseInt(configuracao.quantidade),
        configuracao.tipoQuestao,
        configuracao.instrucoes,
        key_google
      );

      // Converter questões da IA para o formato da aplicação
      const questoesConvertidas: Questao[] = questoesIA.map((questaoIA, index) => ({
        id: Date.now().toString() + index,
        texto: questaoIA.texto,
        tipo: questaoIA.tipo,
        dificuldade: configuracao.nivel,
        alternativas: questaoIA.alternativas?.map((alt, altIndex) => ({
          id: `${Date.now()}_${index}_${altIndex}`,
          texto: alt.texto,
          correta: alt.correta
        })) || [],
        respostaCorreta: questaoIA.respostaCorreta
      }));

      setQuestoesGeradas(questoesConvertidas);
      Alert.alert('Sucesso', `${questoesConvertidas.length} questões geradas com sucesso!`);

    } catch (error) {
      console.error('Erro ao gerar questões:', error);
      
      // Fallback para dados simulados em caso de erro
      Alert.alert(
        'Erro na IA', 
        'Não foi possível conectar com a IA. Usando dados simulados para demonstração.',
        [
          {
            text: 'OK',
            onPress: () => {
              const questoesSimuladas: Questao[] = [
                {
                  id: Date.now().toString(),
                  texto: `Questão gerada sobre ${configuracao.tema} em ${configuracao.materia}`,
                  tipo: 'objetiva',
                  dificuldade: configuracao.nivel,
                  alternativas: [
                    { id: '1', texto: 'Alternativa A', correta: true },
                    { id: '2', texto: 'Alternativa B', correta: false },
                    { id: '3', texto: 'Alternativa C', correta: false },
                    { id: '4', texto: 'Alternativa D', correta: false }
                  ]
                },
                {
                  id: (Date.now() + 1).toString(),
                  texto: `Questão discursiva sobre ${configuracao.tema}`,
                  tipo: 'discursiva',
                  dificuldade: configuracao.nivel,
                  alternativas: [],
                  respostaCorreta: 'Resposta esperada para esta questão discursiva.'
                }
              ];
              setQuestoesGeradas(questoesSimuladas);
            }
          }
        ]
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function adicionarQuestaoGerada(questao: Questao) {
    addQuestao(questao);
    Alert.alert('Sucesso', 'Questão adicionada à avaliação!');
  }

  function adicionarTodasQuestoes() {
    questoesGeradas.forEach(questao => addQuestao(questao));
    Alert.alert('Sucesso', `${questoesGeradas.length} questões adicionadas à avaliação!`);
    router.back();
  }

  function getNivelText(nivel: string) {
    return nivel === 'facil' ? 'Fácil' : nivel === 'medio' ? 'Médio' : 'Difícil';
  }

  function getTipoText(tipo: string) {
    return tipo === 'objetiva' ? 'Objetiva' : tipo === 'discursiva' ? 'Discursiva' : 'Mista';
  }

  return (
    <ThemedView style={[
      styles.container,
      { backgroundColor: theme.colors.background }
    ]}>
      <ThemedView style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <ThemedText type="title" style={[
          styles.headerTitle,
          { color: theme.colors.text }
        ]}>
          Gerar Questões com IA
        </ThemedText>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.configSection}>
          <ThemedText style={[
            styles.sectionTitle,
            { color: theme.colors.text }
          ]}>
            Configuração da Geração
          </ThemedText>

          <TextInput
            placeholder="Matéria (ex: Matemática, História, Português)"
            placeholderTextColor="#888"
            value={configuracao.materia}
            onChangeText={(text) => setConfiguracao(prev => ({ ...prev, materia: text }))}
            style={[styles.input, { color: theme.colors.text }]}
          />

          <TextInput
            placeholder="Tema específico (ex: Equações do 1º grau, Revolução Industrial)"
            placeholderTextColor="#888"
            value={configuracao.tema}
            onChangeText={(text) => setConfiguracao(prev => ({ ...prev, tema: text }))}
            style={[styles.input, { color: theme.colors.text }]}
          />

          <ThemedText style={[styles.label, { color: theme.colors.text }]}>Nível de Dificuldade</ThemedText>
          <ThemedView style={styles.optionsContainer}>
            {(['facil', 'medio', 'dificil'] as const).map((nivel) => (
              <Pressable
                key={nivel}
                style={[
                  styles.optionButton,
                  configuracao.nivel === nivel && styles.optionButtonActive
                ]}
                onPress={() => setConfiguracao(prev => ({ ...prev, nivel }))}
              >
                <ThemedText style={[
                  styles.optionButtonText,
                  configuracao.nivel === nivel && styles.optionButtonTextActive
                ]}>
                  {getNivelText(nivel)}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          <ThemedText style={[styles.label, { color: theme.colors.text }]}>Quantidade de Questões</ThemedText>
          <TextInput
            placeholder="5"
            placeholderTextColor="#888"
            value={configuracao.quantidade.toString()}
            onChangeText={(text) => {
              const num = parseInt(text);
              if (!isNaN(num) && Number.isInteger(num) && num > 0) {
                setConfiguracao(prev => ({ ...prev, quantidade: text }));
              } else {
                setConfiguracao(prev => ({ ...prev, quantidade: '' }));
              }
            }}
            style={[styles.input, { color: theme.colors.text }]}
            keyboardType="numeric"
          />

          <ThemedText style={[styles.label, { color: theme.colors.text }]}>Tipo de Questão</ThemedText>
          <ThemedView style={styles.optionsContainer}>
            {(['objetiva', 'discursiva', 'mista'] as const).map((tipo) => (
              <Pressable
                key={tipo}
                style={[
                  styles.optionButton,
                  configuracao.tipoQuestao === tipo && styles.optionButtonActive
                ]}
                onPress={() => setConfiguracao(prev => ({ ...prev, tipoQuestao: tipo }))}
              >
                <ThemedText style={[
                  styles.optionButtonText,
                  configuracao.tipoQuestao === tipo && styles.optionButtonTextActive
                ]}>
                  {getTipoText(tipo)}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          <TextInput
            placeholder="Instruções adicionais (opcional)"
            placeholderTextColor="#888"
            value={configuracao.instrucoes}
            onChangeText={(text) => setConfiguracao(prev => ({ ...prev, instrucoes: text }))}
            style={[styles.input, { height: 80, color: theme.colors.text }]}
            multiline
          />

          <Pressable
            style={[
              styles.generateButton,
              { backgroundColor: theme.dark ? '#4a90e2' : '#0a7ea4' },
              isGenerating && styles.disabledButton
            ]}
            onPress={gerarQuestoesIAHandler}
            disabled={isGenerating}
          >
            <Ionicons 
              name={isGenerating ? "hourglass" : "sparkles"} 
              size={24} 
              color="#fff" 
            />
            <ThemedText style={styles.generateButtonText}>
              {isGenerating ? 'Gerando Questões...' : 'Gerar Questões com IA'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {questoesGeradas.length > 0 && (
          <ThemedView style={styles.resultsSection}>
            <ThemedView style={styles.resultsHeader}>
              <ThemedText style={[
                styles.sectionTitle,
                { color: theme.colors.text }
              ]}>
                Questões Geradas ({questoesGeradas.length})
              </ThemedText>
              <Pressable
                style={[
                  styles.addAllButton,
                  { backgroundColor: theme.dark ? '#4CAF50' : '#4CAF50' }
                ]}
                onPress={adicionarTodasQuestoes}
              >
                <ThemedText style={styles.addAllButtonText}>Adicionar Todas</ThemedText>
              </Pressable>
            </ThemedView>

            <FlatList
              data={questoesGeradas}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <ThemedView style={[
                  styles.questaoCard,
                  { 
                    backgroundColor: theme.dark ? '#1a1a1a' : '#fafafa',
                    borderColor: theme.dark ? '#333' : '#e0e0e0'
                  }
                ]}>
                  <ThemedView style={styles.questaoHeader}>
                    <ThemedText style={[
                      styles.questaoNumero,
                      { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
                    ]}>
                      {index + 1}.
                    </ThemedText>
                    <ThemedText style={[
                        styles.questaoTexto,
                        { color: theme.colors.text }
                    ]}>
                        {item.texto}
                    </ThemedText>
                  </ThemedView>

                  {item.tipo === 'objetiva' && (
                    <ThemedView style={styles.alternativasContainer}>
                      {item.alternativas.map((alt, altIndex) => (
                        <ThemedView key={alt.id} style={styles.alternativaItem}>
                          <ThemedText style={[
                            styles.alternativaLetra,
                            { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
                          ]}>
                            {String.fromCharCode(65 + altIndex)})
                          </ThemedText>
                          <ThemedText style={[
                            styles.alternativaTexto,
                            { color: theme.colors.text }
                          ]}>
                            {alt.texto}
                          </ThemedText>
                          {alt.correta && (
                            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                          )}
                        </ThemedView>
                      ))}
                    </ThemedView>
                  )}

                  <Pressable
                    style={[
                      styles.addQuestaoButton,
                      { backgroundColor: theme.dark ? '#4a90e2' : '#0a7ea4' }
                    ]}
                    onPress={() => adicionarQuestaoGerada(item)}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <ThemedText style={styles.addQuestaoButtonText}>
                      Adicionar Questão
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              )}
            />
          </ThemedView>
        )}
      </ScrollView>
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
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  configSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  optionButtonText: {
    fontWeight: '600',
    color: '#687076',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  resultsSection: {
    padding: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addAllButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  questaoCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 120,
  },
  questaoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  questaoNumero: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 16,
    minWidth: 30,
  },
  questaoTexto: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 16,
    textAlign: 'justify',
    flexWrap: 'wrap',
    flex: 1,
  },
  alternativasContainer: {
    gap: 10,
    marginBottom: 16,
  },
  alternativaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  alternativaLetra: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
    minWidth: 20,
    marginTop: 2,
  },
  alternativaTexto: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'justify',
  },
  addQuestaoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  addQuestaoButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
}); 