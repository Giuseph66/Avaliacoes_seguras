import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { firestore } from '@/utils/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, BackHandler, Pressable, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';

interface Questao {
  id: string;
  tipo: 'discursiva' | 'objetiva';
  texto: string;
  alternativas?: string[];
  respostaCorreta?: string;
}

interface Prova {
  id: string;
  titulo: string;
  questoes: Questao[];
  tempoLimite?: number;
}

export default function ProvaSegura() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const [prova, setProva] = useState<Prova | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [aluno, setAluno] = useState<any>(null);
  const [tempoRestante, setTempoRestante] = useState<number>(0);
  const [iniciadoEm, setIniciadoEm] = useState<Date | null>(null);
  const appState = useRef(AppState.currentState);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const jaSinalizadoRef = useRef(false);
  const alunoRef = useRef<any>(null);
  const salaIdRef = useRef<string | undefined>(undefined);
  const [ liberado, setLiberado ] = useState(false);
  const liberadoRef = useRef(false);

  useEffect(() => {
    alunoRef.current = aluno;
    salaIdRef.current = params?.salaId as string | undefined;
  }, [aluno, params?.salaId]);

  useEffect(() => { liberadoRef.current = liberado; }, [liberado]);

  /**
   * Trata qualquer tentativa de sair/violar a prova segura.
   * Marca o aluno na sala com status `fora_sala` e redireciona para sala de espera.
   */
  async function handleSaidaSuspeita(motivo: string) {
    if (liberadoRef.current) return; // já finalizou
    if (jaSinalizadoRef.current) return;
    jaSinalizadoRef.current = true;

    try {
      if (salaIdRef.current && alunoRef.current && !liberadoRef.current) {
        const alunoDoc = doc(firestore, 'salas', String(salaIdRef.current), 'alunos', alunoRef.current.id);
        await setDoc(alunoDoc, { id: alunoRef.current.id, nome: alunoRef.current.nome, status: 'fora_sala', motivo });
        Alert.alert(
          'Comportamento suspeito',
          'Detectamos que você saiu ou tentou capturar a tela da prova. Aguarde a liberação do professor para continuar.',
          [
            {
              text: 'OK',
              onPress: () =>
                router.replace({ pathname: '/aluno/sala-reflexao', params: { salaId: salaIdRef.current } } as any),
            },
          ]
        );
      }
    } catch (e) {
      console.log('Erro ao atualizar status fora_sala:', e);
    }

  }

  // Verificar se os parâmetros necessários existem
  useEffect(() => {
    if (!params || !params.provaId) {
      Alert.alert(
        'Erro',
        'Parâmetros da prova não encontrados',
        [
          { text: 'OK', onPress: () => router.replace('/aluno') }
        ]
      );
      return;
    }
  }, [params, router]);

  // Buscar dados do aluno logado
  useEffect(() => {
    const buscarAluno = async () => {
      try {
        const alunoData = await AsyncStorage.getItem('usuarioLogado');
        if (alunoData) {
          const alunoObj = JSON.parse(alunoData);
          setAluno(alunoObj);
        } else {
          Alert.alert('Erro', 'Usuário não logado');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Erro ao buscar aluno:', error);
        Alert.alert('Erro', 'Erro ao carregar dados do usuário');
        router.replace('/login');
      }
    };

    buscarAluno();
  }, []); // Executa apenas uma vez na montagem

  // Buscar prova do Firebase
  useEffect(() => {
    if (!params || !params.provaId || !aluno) return;
    
    let isMounted = true;
    
    const buscarProva = async () => {
      try {
        const provaRef = doc(firestore, 'provas', String(params.provaId));
        const provaSnap = await getDoc(provaRef);
        if (!isMounted) return;
        if (!provaSnap.exists()) {
          Alert.alert('Erro', 'Prova não encontrada');
          router.back();
          return;
        }
        const provaData = provaSnap.data() as any;
        // Buscar fimProva da sala
        const salaRef = doc(firestore, 'salas', String(params.salaId));
        const salaSnap = await getDoc(salaRef);
        let tempoRestanteSeg = 0;
        if (salaSnap.exists() && salaSnap.data().fimProva) {
          const fimProva = salaSnap.data().fimProva;
          const fimDate = fimProva.seconds ? new Date(fimProva.seconds * 1000) : new Date(fimProva);
          const agora = new Date();
          const diffMs = fimDate.getTime() - agora.getTime();
          console.log('diffMs', diffMs);
          tempoRestanteSeg = Math.max(0, Math.ceil(diffMs / 1000));
          if (provaData.provaCriptografada) {
            try {
              const provaDescriptografada = JSON.parse(atob(provaData.provaCriptografada));
              setProva({
                id: provaData.id || params.provaId,
                titulo: provaDescriptografada.titulo || 'Prova',
                questoes: provaDescriptografada.questoes || [],
                tempoLimite: tempoRestanteSeg
              });
              setQuestoes(provaDescriptografada.questoes || []);
            } catch (error) {
              console.error('Erro ao descriptografar prova:', error);
              Alert.alert('Erro', 'Erro ao descriptografar a prova');
              router.back();
              return;
            }
          } else {
            setProva({
              id: provaData.id || params.provaId,
              titulo: provaData.titulo || 'Prova',
              questoes: provaData.questoes || [],
              tempoLimite: tempoRestanteSeg
            });
            setQuestoes(provaData.questoes || []);
          }
          if (diffMs <= 0) {
            Alert.alert('Tempo esgotado', 'O tempo da prova já terminou.', [
              {
                text: 'OK',
                onPress: () => {
                  setLiberado(true);
                  deleteDoc(doc(firestore,'salas',String(params.salaId),'alunos',alunoRef.current.id));
                  router.replace('/aluno/historico');
                }
              }
            ]);
            return;
          }
        } else {
          Alert.alert('Erro', 'Configuração de tempo da prova não encontrada.');
          router.back();
          return;
        }
        // Descriptografar a prova se estiver criptografada
        setTempoRestante(tempoRestanteSeg);
        setIniciadoEm(new Date());
      } catch (error) {
        console.error('Erro ao buscar prova:', error);
        Alert.alert('Erro', 'Erro ao carregar a prova');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    buscarProva();

    return () => {
      isMounted = false;
    };
  }, [params?.provaId, aluno?.id]); // Dependências específicas

  // Timer da prova
  useEffect(() => {
    if (!tempoRestante || !iniciadoEm) return;

    const interval = setInterval(() => {
      setTempoRestante(prev => {
        if (prev <= 1) {
          finalizarProva();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [tempoRestante, iniciadoEm]);

  // Bloquear botão voltar físico e tratar como saída suspeita
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleSaidaSuspeita('hardware_back');
      return true;
    });
    return () => backHandler.remove();
  }, [aluno, params?.salaId]);

  // Detectar se o app foi para background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current === 'active' && nextAppState !== 'active') {
        handleSaidaSuspeita('app_background');
      }
      appState.current = nextAppState;
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [aluno, params?.salaId]);

  // Detecta perda de foco somente uma vez, sem depender de props (evita falsos positivos de re-render)
  useFocusEffect(
    React.useCallback(() => {
      // Ao ganhar foco – nada
      return () => {
        // Perdeu foco => possível overlay / troca de app
        handleSaidaSuspeita('focus_lost');
      };
    }, [])
  );

  // Bloqueia prints de tela
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();
    const sub = ScreenCapture.addScreenshotListener(() => {
      handleSaidaSuspeita('screenshot');
    });
    return () => {
      sub.remove();
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  function formatarTempo(segundos: number): string {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  }

  async function finalizarProva() {
    setLiberado(true);
    liberadoRef.current = true;
    if (!prova || !aluno) return;
    
    try {
      // Salvar respostas no Firebase
      const respostaRef = doc(firestore, 'respostas', `${aluno.id}_${prova.id}`);
      await setDoc(respostaRef, {
        alunoId: aluno.id,
        alunoNome: aluno.nome,
        provaId: prova.id,
        provaTitulo: prova.titulo,
        respostas,
        iniciadoEm,
        finalizadoEm: new Date(),
        tempoUtilizado: prova.tempoLimite ? prova.tempoLimite - tempoRestante : 0,
        salaId: params.salaId
      });

      // Atualizar sala para marcar que o aluno finalizou
      if (params.salaId) {
        const finalizadoDoc = doc(firestore, 'salas', String(params.salaId), 'alunosFinalizados', aluno.id);
        await setDoc(finalizadoDoc, {
          id: aluno.id,
          nome: aluno.nome,
          respostaId: `${aluno.id}_${prova.id}`,
          resposta: respostas,
          finalizadoEm: new Date()
        });
      }
      deleteDoc(doc(firestore,'salas',String(params.salaId),'alunos',alunoRef.current.id));

      Alert.alert(
        'Prova Finalizada',
        'Sua prova foi enviada com sucesso!',
        [
          { text: 'OK', onPress: () => router.replace('/aluno/historico') }
        ]
      );
      router.replace('/aluno/historico')
    } catch (error) {
      Alert.alert('Erro', 'Erro ao finalizar a prova');
    }
  }

  if (!params || !params.provaId) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ThemedText style={{ color: theme.colors.text, textAlign: 'center' }}>Carregando...</ThemedText>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ThemedText style={{ color: theme.colors.text, textAlign: 'center' }}>Carregando prova...</ThemedText>
      </ThemedView>
    );
  }

  if (!prova) {
    setTimeout(() => {
      Alert.alert('Prova não encontrada', 'A prova não foi encontrada. Você será redirecionado para a tela de histórico.', [
        { text: 'OK', onPress: () => router.replace({ pathname: '/aluno/historico' } as any) }
      ]);
    }, 3000);
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ThemedText style={{ color: theme.colors.text, textAlign: 'center' }}>Prova não encontrada</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      {/* Header com informações da prova */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={{ color: theme.colors.text }}>{prova.titulo}</ThemedText>
        <View style={styles.headerInfo}>
          <ThemedText style={{ color: theme.colors.text, fontSize: 14 }}>
            {questoes.length} questão{questoes.length !== 1 ? 'ões' : ''}
          </ThemedText>
          <ThemedText style={{ color: theme.colors.text, fontSize: 14, fontWeight: 'bold' }}>
            Tempo: {formatarTempo(tempoRestante)}
          </ThemedText>
        </View>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {questoes && questoes.length > 0 ? (
          questoes.map((questao, index) => (
            <View key={questao.id || index} style={styles.questaoContainer}>
              <ThemedText type="subtitle" style={[styles.questaoTitulo, { color: theme.colors.text }]}>
                Questão {index + 1} - {questao.tipo === 'discursiva' ? 'Discursiva' : 'Objetiva'}
              </ThemedText>
              
              <ThemedText style={[styles.questaoTexto, { color: theme.colors.text }]}>
                {questao.texto}
              </ThemedText>

              {questao.tipo === 'discursiva' ? (
                <TextInput
                  placeholder="Digite sua resposta aqui..."
                  value={respostas[questao.id] || ''}
                  onChangeText={text => setRespostas({ ...respostas, [questao.id]: text })}
                  multiline
                  style={[styles.input, { color: theme.colors.text, backgroundColor: theme.dark ? '#222' : '#fff', borderColor: theme.dark ? '#444' : '#ccc' }]}
                  placeholderTextColor={theme.dark ? '#888' : '#999'}
                  textAlignVertical="top"
                />
              ) : (
                <View style={styles.alternativasContainer}>
                  {questao.alternativas?.map((alternativa, altIndex) => (
                    <Pressable
                      key={altIndex}
                      style={[
                        styles.alternativa,
                        { 
                          backgroundColor: respostas[questao.id] === alternativa 
                            ? (theme.dark ? '#4a90e2' : '#0a7ea4') 
                            : (theme.dark ? '#333' : '#f5f5f5'),
                          borderColor: theme.dark ? '#555' : '#ddd'
                        }
                      ]}
                      onPress={() => setRespostas({ ...respostas, [questao.id]: alternativa })}
                    >
                      <ThemedText style={[
                        styles.alternativaTexto,
                        { 
                          color: respostas[questao.id] === alternativa 
                            ? '#fff' 
                            : theme.colors.text 
                        }
                      ]}>
                        {String.fromCharCode(65 + altIndex)}. {typeof alternativa === 'string' ? alternativa : (typeof alternativa === 'object' && alternativa !== null && 'texto' in alternativa ? (alternativa as any).texto : JSON.stringify(alternativa))}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))
        ) : (
          <ThemedText style={{ color: theme.colors.text, textAlign: 'center' }}>
            Nenhuma questão encontrada
          </ThemedText>
        )}
      </ScrollView>

      {/* Botões de navegação */}
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.finalizarButton, { backgroundColor: theme.dark ? '#d32f2f' : '#f44336' }]} 
          onPress={finalizarProva}
        >
          <ThemedText style={styles.finalizarButtonText}>Finalizar Prova</ThemedText>
        </Pressable>
      </View>
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
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 16,
  },
  questaoContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  questaoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  questaoTexto: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: 16,
  },
  alternativasContainer: {
    gap: 12,
  },
  alternativa: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    minHeight: 50,
    justifyContent: 'center',
  },
  alternativaTexto: {
    fontSize: 16,
    lineHeight: 22,
  },
  buttonContainer: {
    marginTop: 16,
    gap: 12,
  },
  finalizarButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  finalizarButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 