import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, ScrollView, StatusBar, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Questao } from '@/types/avaliacao';
import { gerarHTMLProva } from '@/utils/pdfTemplate';
import { useProvaStore } from '@/utils/provaStore';
import { useTheme } from '@react-navigation/native';
import { doc } from 'firebase/firestore';
import { firestore } from '@/utils/firebaseConfig';
import { getDoc } from 'firebase/firestore';

export default function VisualizarProva() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams();
  const [respostas, setRespostas] = useState<{ [key: string]: string }>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { titulo: provaStoreTitulo, descricao: provaStoreDescricao, questoes: provaStoreQuestoes } = useProvaStore();
  const [provaData, setProvaData] = useState({
    titulo: '',
    descricao: '',
    questoes: []
  });

  useEffect(() => {
    async function getProva() {
      if (id) {
        const provaRef = doc(firestore, 'provas', String(id));
        const provaDoc = await getDoc(provaRef);
        if (provaDoc.exists()) {
          const data = provaDoc.data();
          const provaCriptografada = data.provaCriptografada;
          const provaDescriptografada = JSON.parse(require('base-64').decode(provaCriptografada));
          setProvaData({
            titulo: provaDescriptografada.titulo,
            descricao: provaDescriptografada.descricao,
            questoes: provaDescriptografada.questoes
          });
        }
      }
    }
    getProva();
  }, [id]);

  const prova = {
    titulo: id ? provaData.titulo : provaStoreTitulo || 'Avaliação de Matemática - 1º Bimestre',
    descricao: id ? provaData.descricao : provaStoreDescricao || 'Prova sobre álgebra básica e equações do primeiro grau. Tempo: 60 minutos.',
    questoes: id ? provaData.questoes : provaStoreQuestoes.length > 0 ? provaStoreQuestoes : [
      {
        id: '1',
        texto: 'Qual é o resultado da equação 2x + 5 = 13?',
        tipo: 'objetiva' as const,
        dificuldade: 'média',
        alternativas: [
          { id: '1a', texto: 'x = 3', correta: false },
          { id: '1b', texto: 'x = 4', correta: true },
          { id: '1c', texto: 'x = 5', correta: false },
          { id: '1d', texto: 'x = 6', correta: false },
        ],
      },
      {
        id: '2',
        texto: 'Resolva a equação: 3(x - 2) = 15',
        tipo: 'objetiva' as const,
        dificuldade: 'difícil',
        alternativas: [
          { id: '2a', texto: 'x = 5', correta: false },
          { id: '2b', texto: 'x = 6', correta: false },
          { id: '2c', texto: 'x = 7', correta: true },
          { id: '2d', texto: 'x = 8', correta: false },
        ],
      },
      {
        id: '3',
        texto: 'Explique o conceito de variável em álgebra e dê um exemplo prático.',
        tipo: 'discursiva' as const,
        dificuldade: 'média',
        alternativas: [],
        respostaCorreta: 'Uma variável é um símbolo que representa um valor desconhecido ou que pode variar. Exemplo: na equação x + 5 = 10, x é a variável que representa o valor 5.',
      },
      {
        id: '4',
        texto: 'Qual é a fórmula para calcular a área de um retângulo?',
        tipo: 'objetiva' as const,
        dificuldade: 'fácil',
        alternativas: [
          { id: '4a', texto: 'A = l + c', correta: false },
          { id: '4b', texto: 'A = l × c', correta: true },
          { id: '4c', texto: 'A = l²', correta: false },
          { id: '4d', texto: 'A = 2(l + c)', correta: false },
        ],
      },
    ]
  };

  function handleRespostaObjetiva(questaoId: string, alternativaId: string) {
    setRespostas(prev => ({
      ...prev,
      [questaoId]: alternativaId
    }));
  }

  function handleRespostaDiscursiva(questaoId: string, texto: string) {
    setRespostas(prev => ({
      ...prev,
      [questaoId]: texto
    }));
  }

  async function gerarPDF() {
    if (prova.questoes.length === 0) {
      Alert.alert('Aviso', 'Adicione pelo menos uma questão antes de gerar o PDF.');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const html = await gerarHTMLProva(prova.titulo, prova.descricao, prova.questoes);
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartilhar Prova'
        });
      } else {
        Alert.alert('Sucesso', 'PDF gerado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  }

  async function verInfoProva() {
    setIsSharing(true);
    try {
      const texto = `Prova: ${prova.titulo}\n\n${prova.descricao}\n\nTotal de questões: ${prova.questoes.length}`;
      
      // Usar Alert para mostrar as informações da prova em vez de tentar compartilhar
      Alert.alert(
        'Informações da Prova',
        texto,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar as informações da prova.');
    } finally {
      setIsSharing(false);
    }
  }

  function renderQuestao({ item, index }: { item: Questao; index: number }) {
    return (
      <ThemedView style={[
        styles.questaoContainer,
        { 
          backgroundColor: theme.dark ? '#1a1a1a' : '#fafafa',
          borderColor: theme.dark ? '#333' : '#e0e0e0'
        }
      ]}>
        <ThemedView style={styles.questaoHeader}>
         
        </ThemedView>
        
        <ThemedText style={[
          styles.questaoTexto,
          { color: theme.colors.text }
          ]}>
             <ThemedText style={[
            styles.questaoNumero,
            { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
          ]}>
            {index + 1}) 
          </ThemedText>{item.texto}
        </ThemedText>
        
        {/* Imagem da questão */}
        {item.imagem && (
          <Image 
            source={{ uri: item.imagem }} 
            style={styles.questaoImagem} 
            resizeMode="cover" 
          />
        )}
        
        {item.tipo === 'objetiva' ? (
          <ThemedView style={styles.alternativasContainer}>
            {item.alternativas.map((alt, altIndex) => (
              <Pressable
                key={alt.id}
                style={[
                  styles.alternativaItem,
                  { 
                    backgroundColor: theme.dark ? '#2a2a2a' : '#fff',
                    borderColor: respostas[item.id] === alt.id 
                      ? (theme.dark ? '#4a90e2' : '#0a7ea4')
                      : (theme.dark ? '#444' : '#ddd')
                  },
                  respostas[item.id] === alt.id && {
                    backgroundColor: theme.dark ? '#2a2a2a' : '#fff',
                    borderWidth: 2
                  }
                ]}
                onPress={() => handleRespostaObjetiva(item.id, alt.id)}
              >
                <ThemedText style={[
                  styles.alternativaLetra,
                  { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
                ]}>
                  {String.fromCharCode(65 + altIndex)})
                </ThemedText>
                <ThemedView style={styles.alternativaContent}>
                  <ThemedText style={[
                    styles.alternativaTexto,
                    { 
                      color: theme.colors.text,
                      backgroundColor: theme.dark ? '#2a2a2a' : '#fff'
                    }
                  ]}>
                    {alt.texto}
                  </ThemedText>
                  
                  {/* Imagem da alternativa */}
                  {alt.imagem && (
                    <Image 
                      source={{ uri: alt.imagem }} 
                      style={styles.alternativaImagem} 
                      resizeMode="cover" 
                    />
                  )}
                </ThemedView>
                
                {respostas[item.id] === alt.id && (
                  <Ionicons 
                    style={{ position: 'absolute', right: 10 }}
                    name="checkmark-circle" 
                    size={20} 
                    color={theme.dark ? '#4a90e2' : '#0a7ea4'} 
                  />
                )}
              </Pressable>
            ))}
          </ThemedView>
        ) : (
          <TextInput
            style={[
              styles.respostaDiscursiva,
              { 
                backgroundColor: theme.dark ? '#2a2a2a' : '#fff',
                borderColor: theme.dark ? '#444' : '#ddd',
                color: theme.colors.text
              }
            ]}
            placeholder="Digite sua resposta aqui..."
            placeholderTextColor={theme.dark ? '#888' : '#999'}
            value={respostas[item.id] || ''}
            onChangeText={(text) => handleRespostaDiscursiva(item.id, text)}
            multiline
            textAlignVertical="top"
          />
        )}
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <ThemedText type="title" style={[
          styles.headerTitle,
          { color: theme.colors.text }
        ]}>
          Visualizar Prova
        </ThemedText>
      </ThemedView>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <ThemedView style={[
          styles.provaInfo,
          { 
            borderBottomColor: theme.dark ? '#333' : '#e0e0e0',
            backgroundColor: theme.colors.background
          }
        ]}>
          <ThemedText style={[
            styles.provaTitulo,
            { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
          ]}>
            {prova.titulo}
          </ThemedText>
          <ThemedText style={[
            styles.provaDescricao,
            { color: theme.dark ? '#ccc' : '#666' }
          ]}>
            {prova.descricao}
          </ThemedText>
          
          <ThemedView style={[
            styles.provaStats,
            { backgroundColor: theme.dark ? '#2a2a2a' : '#f8f9fa' }
          ]}>
            <ThemedView style={styles.statItem}>
              <ThemedText style={[
                styles.statLabel,
                { color: theme.dark ? '#aaa' : '#888' }
              ]}>
                Total de questões
              </ThemedText>
              <ThemedText style={[
                styles.statValue,
                { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
              ]}>
                {prova.questoes.length}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.statItem}>
              <ThemedText style={[
                styles.statLabel,
                { color: theme.dark ? '#aaa' : '#888' }
              ]}>
                Objetivas
              </ThemedText>
              <ThemedText style={[
                styles.statValue,
                { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
              ]}>
                {prova.questoes.filter(q => q.tipo === 'objetiva').length}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.statItem}>
              <ThemedText style={[
                styles.statLabel,
                { color: theme.dark ? '#aaa' : '#888' }
              ]}>
                Discursivas
              </ThemedText>
              <ThemedText style={[
                styles.statValue,
                { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
              ]}>
                {prova.questoes.filter(q => q.tipo === 'discursiva').length}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        <FlatList
          data={prova.questoes}
          keyExtractor={(item) => item.id}
          renderItem={renderQuestao}
          scrollEnabled={false}
          contentContainerStyle={styles.questoesList}
        />
      </ScrollView>

      <ThemedView style={[
        styles.footer,
        { 
          borderTopColor: theme.dark ? '#333' : '#e0e0e0',
          backgroundColor: theme.colors.background
        }
      ]}>
        <ThemedView style={styles.buttonContainer}>
          <Pressable 
            style={[
              styles.secondaryButton, 
              { flex: 1 },
              { backgroundColor: theme.dark ? '#555' : '#687076' }
            ]} 
            onPress={verInfoProva}
            disabled={isSharing}
          >
            <ThemedText style={styles.buttonText}>
              {isSharing ? 'Carregando...' : 'Ver Info'}
            </ThemedText>
          </Pressable>
          
          <Pressable 
            style={[
              styles.primaryButton, 
              { flex: 1, marginLeft: 8 },
              { backgroundColor: theme.dark ? '#4a90e2' : '#0a7ea4' }
            ]} 
            onPress={gerarPDF}
            disabled={isGeneratingPDF}
          >
            <ThemedText style={styles.buttonText}>
              {isGeneratingPDF ? 'Gerando PDF...' : 'Gerar PDF'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 10,
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
  provaInfo: {
    padding: 16,
    borderBottomWidth: 1,
  },
  provaTitulo: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  provaDescricao: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 22,
  },
  provaStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  questoesList: {
    padding: 16,
  },
  questaoContainer: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 100,
  },
  questaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  questaoNumero: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 12,
    minWidth: 30,
  },
  questaoTexto: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 16,
    textAlign: 'justify',
    flexWrap: 'wrap',
  },
  questaoImagem: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 20,
  },
  alternativasContainer: {
    gap: 12,
  },
  alternativaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 60,
  },
  alternativaLetra: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 16,
    minWidth: 25,
    marginTop: 2,
  },
  alternativaContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  alternativaTexto: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'justify',
  },
  alternativaImagem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginLeft: 12,
    marginTop: 4,
  },
  respostaDiscursiva: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 