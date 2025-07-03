import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { firestore } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StatusBar, StyleSheet } from 'react-native';

interface QuestaoDet {
  id: string;
  texto: string;
  tipo: 'objetiva' | 'discursiva';
  alternativas?: any[];
  respostaCorreta?: string;
  respostaAlunoTexto?: string | undefined;
  respostaAlunoId?: string | undefined;
  acertou: boolean;
  nota?: number;
  comentario?: string;
}

export default function DetalheResposta() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const [questoes, setQuestoes] = useState<QuestaoDet[]>([]);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [notaGeral, setNotaGeral] = useState<number | null>(null);
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    acertos: 0,
    objetivas: 0,
    discursivas: 0
  });

  useEffect(() => {
    if (!params?.respostaId) {
      router.back();
      return;
    }
    (async () => {
      try {
        // Pega resposta
        const respSnap = await getDoc(doc(firestore, 'respostas', String(params.respostaId)));
        if (!respSnap.exists()) {
          router.back();
          return;
        }
        const respData: any = respSnap.data();
        console.log('respData', respData);
        setTitulo(respData.provaTitulo || 'Prova');
        setNotaGeral(respData.notaGeral);
        const respostasAlunoRaw = respData.respostas || {};
        
        // Pega prova
        const provaSnap = await getDoc(doc(firestore, 'provas', String(respData.provaId)));
        if (!provaSnap.exists()) {
          router.back();
          return;
        }
        const provaData: any = provaSnap.data();
        let questoesFonte: any[] = [];
        if (provaData.provaCriptografada) {
          try {
            const desc = JSON.parse(atob(provaData.provaCriptografada));
            console.log('desc', desc);
            questoesFonte = desc.questoes || [];
            setTitulo(desc.titulo || 'Prova');
          } catch (e) {
            console.log('Erro ao descriptografar prova', e);
            questoesFonte = [];
          }
        } else {
          questoesFonte = provaData.questoes || [];
        }

        let qs: QuestaoDet[] = [];
        const questoes = questoesFonte;
        questoes.forEach((q: any) => {
          const respAluno = respostasAlunoRaw[q.id];
          let respTexto: string | undefined;
          let respId: string | undefined;
          let acertou = false;
          let nota: number | undefined;
          let comentario: string | undefined;
          console.log('respAluno', respAluno);
          if (respAluno) {
            if (typeof respAluno === 'object') {
              respTexto = respAluno.texto;
              respId = respAluno.id;
              acertou = !!respAluno.correta;
              nota = respAluno.nota;
              comentario = respAluno.comentario;
              console.log(`Questão ${q.id} - Comentário:`, comentario);
            } else {
              respTexto = String(respAluno);
              // Para questões objetivas, verifica se acertou
              if (q.tipo === 'objetiva') {
                const corretaAlt = q.alternativas?.find((a: any) => 
                  typeof a === 'object' ? a.correta : a === q.respostaCorreta
                );
                acertou = typeof corretaAlt === 'object' ? 
                  (corretaAlt.texto === respTexto) : 
                  (corretaAlt === respTexto);
              }
            }
          }
          
          qs.push({
            id: q.id,
            texto: q.texto,
            tipo: q.tipo,
            alternativas: q.alternativas,
            respostaCorreta: q.respostaCorreta,
            respostaAlunoTexto: respTexto,
            respostaAlunoId: respId,
            acertou,
            nota,
            comentario,
          });
        });
        
        setQuestoes(qs);
        
        
      } catch (e) {
        console.log(e);
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.respostaId]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.dark ? '#4a90e2' : '#0a7ea4'} />
        <ThemedText style={[styles.loadingText, { color: theme.colors.text }]}>
          Carregando detalhes...
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
        <ThemedView style={styles.headerContent}>
          <ThemedText type="title" style={[styles.headerTitle, { color: theme.colors.text }]}>
            {titulo}      
            <ThemedText style={[styles.headerTitle, { color: theme.colors.text, fontSize: 14, fontWeight: 'normal' , marginLeft: 4}]}>
              ({questoes.length} questões)
            </ThemedText>
          </ThemedText>
          {notaGeral !== null && (
            <ThemedView style={[styles.notaGeralBox, { backgroundColor: notaGeral >= 7 ? 'rgba(76,175,80,0.15)' : notaGeral >= 5 ? 'rgba(255,152,0,0.15)' : 'rgba(244,67,54,0.15)' }]}>
              <ThemedText style={[styles.notaGeralTexto, { color: notaGeral >= 7 ? '#4caf50' : notaGeral >= 5 ? '#ff9800' : '#f44336' }]}>
                Nota Geral: {notaGeral}/10
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>

      <FlatList
        data={questoes}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const acertou = item.acertou;
          return (
            <ThemedView style={[styles.questaoCard, { backgroundColor: theme.dark ? '#1a1a1a' : '#fafafa', borderColor: theme.dark ? '#333' : '#e0e0e0' }]}>
              <ThemedView style={styles.questaoHeader}>
                <ThemedView style={styles.questaoInfo}>
                  <ThemedText style={[styles.questaoNumero, { color: theme.dark ? '#4a90e2' : '#0a7ea4' }]}>
                    {index + 1}.
                  </ThemedText>
                  <ThemedText style={[styles.questaoTexto, { color: theme.colors.text }]}>
                    {item.texto}
                  </ThemedText>
                </ThemedView>
                    <ThemedView style={styles.questaoActions}>
                        {item.tipo === 'objetiva' && (

                  <ThemedView style={[styles.resultadoBox, { backgroundColor: acertou ? 'rgba(76,175,80,0.15)' : 'rgba(229,57,53,0.15)' }]}>
                    <Ionicons 
                      name={acertou ? "checkmark-circle" : "close-circle"} 
                      size={20} 
                      color={acertou ? '#4caf50' : '#e53935'} 
                      />
                    <ThemedText style={[styles.resultadoTexto, { color: acertou ? '#4caf50' : '#e53935' }]}>
                      {acertou ? 'Acertou' : 'Errou'}
                    </ThemedText>
                  </ThemedView>
                    )}
                </ThemedView>
              </ThemedView>

              {item.tipo === 'objetiva' ? (
                <ThemedView style={styles.alternativasSection}>
                  <ThemedText style={[styles.sectionLabel, { color: theme.colors.text }]}>
                    Alternativas:
                  </ThemedText>
                  {item.alternativas?.map((alt, idx) => {
                    let selecionada = false;
                    if (typeof alt === 'object') {
                      const altObj: any = alt;
                      selecionada = altObj.id === item.respostaAlunoId;
                    } else {
                      selecionada = alt === item.respostaAlunoTexto;
                    }
                    const correta = typeof alt === 'object' ? ((alt as any).id === item.respostaCorreta || (alt as any).correta) : alt === item.respostaCorreta;
                    return (
                      <ThemedView 
                        key={idx} 
                        style={[
                          styles.alternativaItem,
                          { 
                            backgroundColor: correta ? 'rgba(76,175,80,0.15)' : selecionada ? 'rgba(229,57,53,0.15)' : 'transparent',
                            borderColor: correta ? '#4caf50' : selecionada ? '#e53935' : theme.dark ? '#444' : '#ddd'
                          }
                        ]}
                      > 
                        <Ionicons 
                          name={correta ? 'checkmark-circle' : selecionada ? 'close-circle' : 'ellipse'} 
                          size={20} 
                          color={correta ? '#4caf50' : selecionada ? '#e53935' : '#888'} 
                        />
                        <ThemedText style={[styles.alternativaTexto, { color: theme.colors.text }]}>
                          {String.fromCharCode(65 + idx)}. {typeof alt === 'string' ? alt : (alt as any).texto}
                        </ThemedText>
                      </ThemedView>
                    );
                  })}
                  
                  {/* Comentário para questões objetivas */}
                  {item.comentario && (
                    <ThemedView style={styles.comentarioSection}>
                      <ThemedView style={styles.comentarioHeader}>
                        <Ionicons name="chatbubble-ellipses" size={16} color={theme.dark ? '#9c27b0' : '#9c27b0'} />
                        <ThemedText style={[styles.comentarioLabel, { color: theme.dark ? '#9c27b0' : '#9c27b0' }]}>
                          Comentário da IA:
                        </ThemedText>
                      </ThemedView>
                      <ThemedView style={[styles.comentarioBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#f0f8ff', borderColor: theme.dark ? '#9c27b0' : '#9c27b0' }]}>
                        <ThemedText style={[styles.comentarioTexto, { color: theme.colors.text }]}>
                          {item.comentario}
                        </ThemedText>
                      </ThemedView>
                    </ThemedView>
                  )}
                </ThemedView>
              ) : (
                <ThemedView style={styles.discursivaSection}>
                  <ThemedText style={[styles.sectionLabel, { color: theme.colors.text }]}>
                    Sua resposta:
                  </ThemedText>
                  <ThemedView style={[styles.respostaBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#fff', borderColor: theme.dark ? '#444' : '#ddd' }]}>
                    <ThemedText style={[styles.respostaTexto, { color: theme.colors.text }]}>
                      {item.respostaAlunoTexto || 'Sem resposta'}
                    </ThemedText>
                  </ThemedView>
                  
                  {item.nota !== undefined && (
                    <ThemedView style={styles.notaSection}>
                      <ThemedText style={[styles.sectionLabel, { color: theme.colors.text }]}>
                        Nota: {item.nota}/10
                      </ThemedText>
                      {item.comentario && (
                        <ThemedView style={styles.comentarioSection}>
                          <ThemedView style={styles.comentarioHeader}>
                            <Ionicons name="chatbubble-ellipses" size={16} color={theme.dark ? '#9c27b0' : '#9c27b0'} />
                            <ThemedText style={[styles.comentarioLabel, { color: theme.dark ? '#9c27b0' : '#9c27b0' }]}>
                              Comentário da IA:
                            </ThemedText>
                          </ThemedView>
                          <ThemedView style={[styles.comentarioBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#f0f8ff', borderColor: theme.dark ? '#9c27b0' : '#9c27b0' }]}>
                            <ThemedText style={[styles.comentarioTexto, { color: theme.colors.text }]}>
                              {item.comentario}
                            </ThemedText>
                          </ThemedView>
                        </ThemedView>
                      )}
                    </ThemedView>
                  )}
                </ThemedView>
              )}
            </ThemedView>
          );
        }}
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
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  notaGeralBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  notaGeralTexto: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  estatisticasBox: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  estatisticasTitulo: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  estatisticasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  estatisticaItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  estatisticaLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  estatisticaValor: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  questaoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    minHeight: 120,
  },
  questaoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: 'transparent',
},
questaoInfo: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
},
questaoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    textAlign: 'justify',
    flexWrap: 'wrap',
    flex: 1,
},
resultadoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    gap: 4,
    marginLeft: 12,
},
resultadoTexto: {
    fontSize: 14,
    fontWeight: '600',
},
alternativasSection: {
    backgroundColor: 'transparent',
    gap: 8,
},
discursivaSection: {
    backgroundColor: 'transparent',
    gap: 12,
},
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  alternativaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  alternativaTexto: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  respostaBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
  },
  respostaTexto: {
    fontSize: 16,
    lineHeight: 22,
  },
  notaSection: {
    backgroundColor: 'transparent',
    gap: 8,
  },
  comentarioSection: {
    backgroundColor: 'transparent',
    gap: 8,
  },
  comentarioHeader: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comentarioLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  comentarioBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    borderColor: '#9c27b0',
  },
  comentarioTexto: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
}); 