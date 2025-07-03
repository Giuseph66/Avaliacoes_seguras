import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { firestore } from '@/utils/firebaseConfig';
import { corrigirDiscursivasIA, DiscursivaCorrigir } from '@/utils/ia';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StatusBar, StyleSheet, TextInput } from 'react-native';

interface AlunoFinalizado {
  id: string;
  nome: string;
  respostaId: string;
  corrigidoPorIA?: boolean;
  notaGeral?: number;
}

interface Questao {
  id: string;
  texto: string;
  tipo: 'objetiva' | 'discursiva';
  alternativas?: string[];
  respostaCorreta?: string;
}

export default function CorrigirRespostas() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [alunos, setAlunos] = useState<AlunoFinalizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AlunoFinalizado | null>(null);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [respostasAluno, setRespostasAluno] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [notas, setNotas] = useState<Record<string,string>>({});
  const [comentarios, setComentarios] = useState<Record<string,string>>({});
  const [detalhe, setDetalhe] = useState<{questao:any,respostaAluno:any}|null>(null);
  const [iaLoading, setIaLoading] = useState(false);
  const [notasGerais, setNotasGerais] = useState<Record<string, number>>({});
  const keyGoogle = process.env.EXPO_PUBLIC_GOOGLE_KEY || 'AIzaSyD8AUUxeuO9Df465lJmy0oBvvg7rRtlenA';

  useEffect(() => {
    if (!params?.salaId) return;
    const unsub = onSnapshot(collection(firestore,'salas',String(params.salaId),'alunosFinalizados'), snap => {
      const arr: AlunoFinalizado[] = snap.docs.map(d=>d.data() as any);
      setAlunos(arr);
      setLoading(false);
    });
    return () => unsub();
  }, [params?.salaId]);

  async function openDetalhe(aluno: AlunoFinalizado) {
    setSelected(aluno);
    // Busca resposta
    const respSnap = await getDoc(doc(firestore,'respostas',aluno.respostaId));
    if (!respSnap.exists()) return;
    const respData:any = respSnap.data();
    setRespostasAluno(respData.respostas||{});
    // Busca prova
    const provaSnap = await getDoc(doc(firestore,'provas',respData.provaId));
    if (!provaSnap.exists()) return;
    const prova:any = provaSnap.data();
    let qs:Questao[] = prova.questoes || [];
    if (prova.provaCriptografada){
      try{qs = JSON.parse(atob(prova.provaCriptografada)).questoes||[]}catch{}
    }
    setQuestoes(qs);
    // inicializa notas
    const init:Record<string,string> = {};
    qs.forEach(q=>{
      const r = respData.respostas?.[q.id];
      if (typeof r==='object' && r.nota!==undefined){
        init[q.id]=String(r.nota);
      } else if (typeof r === 'string' && q.tipo === 'discursiva') {
        // Para questões discursivas com resposta em string, inicializa com nota vazia
        init[q.id] = '';
      }
    });
    setNotas(init);
    setComentarios({});
    
    // Carrega a nota geral salva no banco ou calcula
    let notaGeral = respData.notaGeral;
    if (notaGeral === undefined) {
      notaGeral = calcularNotaGeral(respData.respostas || {}, qs);
    }
    setNotasGerais(prev => ({ ...prev, [aluno.id]: notaGeral }));
  }

  async function salvarNotas() {
    if (!selected) return;
    setSaving(true);
    try {
      const respostasRef = doc(firestore, 'respostas', selected.respostaId);
      const respostasAtualizadas = { ...respostasAluno };
      
      // Atualiza as respostas com notas e comentários
      Object.keys(notas).forEach(questaoId => {
        const respostaOriginal = respostasAluno[questaoId];
        
        if (typeof respostaOriginal === 'string') {
          // Se a resposta original é uma string, converte para objeto
          respostasAtualizadas[questaoId] = {
            texto: respostaOriginal,
            nota: parseFloat(notas[questaoId]) || 0,
            comentario: comentarios[questaoId] || ''
          };
        } else if (typeof respostaOriginal === 'object' && respostaOriginal !== null) {
          // Se já é um objeto, apenas adiciona os campos
          respostasAtualizadas[questaoId] = {
            ...respostaOriginal,
            nota: parseFloat(notas[questaoId]) || 0,
            comentario: comentarios[questaoId] || ''
          };
        } else {
          // Caso não exista resposta, cria um objeto vazio
          respostasAtualizadas[questaoId] = {
            texto: '',
            nota: parseFloat(notas[questaoId]) || 0,
            comentario: comentarios[questaoId] || ''
          };
        }
      });
      
      // Calcula a nota geral final
      const notaGeralFinal = calcularNotaGeralTempoReal();
      
      // Salva na collection respostas
      await updateDoc(respostasRef, {
        respostas: respostasAtualizadas,
        notaGeral: notaGeralFinal,
        corrigidoEm: new Date()
      });
      
      // Salva na collection alunosFinalizados
      if (params?.salaId) {
        const alunoFinalizadoRef = doc(firestore, 'salas', String(params.salaId), 'alunosFinalizados', selected.id);
        await updateDoc(alunoFinalizadoRef, {
          notaGeral: notaGeralFinal,
          corrigidoEm: new Date()
        });
      }
      
      // Atualiza o estado local
      setNotasGerais(prev => ({ ...prev, [selected.id]: notaGeralFinal }));
      
      setSaving(false);
      //setSelected(null);
    } catch (error) {
      console.error('Erro ao salvar notas:', error);
      setSaving(false);
    }
  }

  async function salvarNotasIA(notasIA: Record<string, string>, comentariosIA: Record<string, string>) {
    if (!selected) return;
    
    try {
      const respostasRef = doc(firestore, 'respostas', selected.respostaId);
      const respostasAtualizadas = { ...respostasAluno };
      
      // Atualiza as respostas com notas e comentários da IA
      Object.keys(notasIA).forEach(questaoId => {
        const respostaOriginal = respostasAluno[questaoId];
        
        if (typeof respostaOriginal === 'string') {
          // Se a resposta original é uma string, converte para objeto
          respostasAtualizadas[questaoId] = {
            texto: respostaOriginal,
            nota: parseFloat(notasIA[questaoId]) || 0,
            comentario: comentariosIA[questaoId] || ''
          };
        } else if (typeof respostaOriginal === 'object' && respostaOriginal !== null) {
          // Se já é um objeto, apenas adiciona os campos
          respostasAtualizadas[questaoId] = {
            ...respostaOriginal,
            nota: parseFloat(notasIA[questaoId]) || 0,
            comentario: comentariosIA[questaoId] || ''
          };
        } else {
          // Caso não exista resposta, cria um objeto vazio
          respostasAtualizadas[questaoId] = {
            texto: '',
            nota: parseFloat(notasIA[questaoId]) || 0,
            comentario: comentariosIA[questaoId] || ''
          };
        }
      });
      
      // Calcula a nota geral final
      const notaGeralFinal = calcularNotaGeral(respostasAtualizadas, questoes);
      
      // Salva na collection respostas
      await updateDoc(respostasRef, {
        respostas: respostasAtualizadas,
        notaGeral: notaGeralFinal,
        corrigidoEm: new Date(),
        corrigidoPorIA: true
      });
      
      // Salva na collection alunosFinalizados
      if (params?.salaId) {
        const alunoFinalizadoRef = doc(firestore, 'salas', String(params.salaId), 'alunosFinalizados', selected.id);
        await updateDoc(alunoFinalizadoRef, {
          notaGeral: notaGeralFinal,
          corrigidoEm: new Date(),
          corrigidoPorIA: true
        });
      }
      
      // Atualiza o estado local
      setNotasGerais(prev => ({ ...prev, [selected.id]: notaGeralFinal }));
      
      console.log('Notas da IA salvas com sucesso');
      salvarNotas();
    } catch (error) {
      console.error('Erro ao salvar notas da IA:', error);
    }
  }

  // Função para calcular nota geral de um aluno
  function calcularNotaGeral(respostas: Record<string, any>, questoes: any[]): number {
    if (!questoes.length) return 0;
    
    let totalNotas = 0;
    let questoesComNota = 0;
    
    questoes.forEach(q => {
      const resposta = respostas[q.id];
      
      if (resposta && typeof resposta === 'object' && resposta.nota !== undefined) {
        // Resposta já tem nota (manual ou IA)
        totalNotas += parseFloat(resposta.nota) || 0;
        questoesComNota++;
      } else if (q.tipo === 'objetiva') {
        // Para questões objetivas, verifica se acertou
        const corretaAlt = q.alternativas?.find((a: any) => 
          typeof a === 'object' ? a.correta : a === q.respostaCorreta
        );
        
        let acertou = false;
        if (typeof resposta === 'object' && resposta !== null) {
          // Resposta é objeto (pode ter id ou texto)
          acertou = resposta.id ? 
            (corretaAlt?.id === resposta.id) : 
            (corretaAlt?.texto === resposta.texto);
        } else if (typeof resposta === 'string') {
          // Resposta é string
          acertou = typeof corretaAlt === 'object' ? 
            (corretaAlt.texto === resposta) : 
            (corretaAlt === resposta);
        }
        
        totalNotas += acertou ? 10 : 0;
        questoesComNota++;
      }
    });
    
    return questoesComNota > 0 ? parseFloat((totalNotas / questoesComNota).toFixed(1)) : 0;
  }

  // Função para calcular nota geral em tempo real
  function calcularNotaGeralTempoReal(): number {
    if (!questoes.length || !selected) return 0;
    
    let totalNotas = 0;
    let questoesComNota = 0;
    
    questoes.forEach(q => {
      const resposta = respostasAluno[q.id];
      
      if (q.tipo === 'discursiva') {
        // Para questões discursivas, usa a nota digitada ou nota salva
        const notaDigitada = notas[q.id];
        if (notaDigitada && notaDigitada.trim() !== '') {
          totalNotas += parseFloat(notaDigitada) || 0;
          questoesComNota++;
        } else if (resposta && typeof resposta === 'object' && resposta.nota !== undefined) {
          totalNotas += parseFloat(resposta.nota) || 0;
          questoesComNota++;
        }
      } else if (q.tipo === 'objetiva') {
        // Para questões objetivas, verifica se acertou
        const corretaAlt = q.alternativas?.find((a: any) => 
          typeof a === 'object' ? a.correta : a === q.respostaCorreta
        );
        
        let acertou = false;
        if (typeof resposta === 'object' && resposta !== null) {
          acertou = resposta.id ? 
            (corretaAlt?.id === resposta.id) : 
            (corretaAlt?.texto === resposta.texto);
        } else if (typeof resposta === 'string') {
          acertou = typeof corretaAlt === 'object' ? 
            (corretaAlt.texto === resposta) : 
            (corretaAlt === resposta);
        }
        
        totalNotas += acertou ? 10 : 0;
        questoesComNota++;
      }
    });
    
    return questoesComNota > 0 ? parseFloat((totalNotas / questoesComNota).toFixed(1)) : 0;
  }

  // Atualiza a nota geral sempre que as notas mudarem
  useEffect(() => {
    if (selected && questoes.length > 0) {
      const novaNotaGeral = calcularNotaGeralTempoReal();
      setNotasGerais(prev => ({ ...prev, [selected.id]: novaNotaGeral }));
    }
  }, [notas, selected, questoes, respostasAluno]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.dark ? '#4a90e2' : '#0a7ea4'} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      {/* Cabeçalho */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.dark ? '#333' : '#e0e0e0', backgroundColor:theme.dark ? '#1a1a1a' : '#fafafa'}]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <ThemedText type="title" style={[styles.headerTitle, { color: theme.colors.text }]}>
          Correção de Respostas
        </ThemedText>
      </ThemedView>

      <ScrollView style={[styles.content, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
        <ThemedView style={[styles.alunosSection, { backgroundColor: theme.colors.background }]}>
          <ThemedText style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Alunos Finalizados ({alunos.length})
          </ThemedText>
          
          <FlatList
            data={alunos}
            keyExtractor={i=>i.id}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({item})=>(
              <Pressable 
                style={[
                  styles.alunoCard,
                  { 
                    backgroundColor: theme.dark ? '#1a1a1a' : '#fafafa',
                    borderColor: theme.dark ? '#333' : '#e0e0e0'
                  }
                ]} 
                onPress={() => openDetalhe(item)}
              >
                <ThemedView style={styles.alunoCardContent}>
                  <ThemedView style={styles.alunoInfo}>
                    <ThemedText style={[styles.alunoNome, { color: theme.colors.text }]}>
                      {item.nome}
                    </ThemedText>
                    {(notasGerais[item.id] !== undefined || item.notaGeral !== undefined) && (
                      <ThemedView style={[styles.notaGeralBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#e8f5e8' }]}>
                        <ThemedText style={[styles.notaGeralTexto, { color: theme.dark ? '#4caf50' : '#2e7d32' }]}>
                          {notasGerais[item.id] ?? item.notaGeral}/10
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                  <ThemedView style={styles.alunoCardActions}>
                    {item.corrigidoPorIA && (
                      <Ionicons name="sparkles" size={16} color={theme.dark ? '#9c27b0' : '#9c27b0'} />
                    )}
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.text}/>
                  </ThemedView>
                </ThemedView>
              </Pressable>
            )}
            ListEmptyComponent={
              <ThemedView style={[styles.emptyState, { backgroundColor: theme.dark ? '#1a1a1a' : '#fafafa' }]}>
                <Ionicons name="people-outline" size={48} color={theme.dark ? '#666' : '#999'} />
                <ThemedText style={[styles.emptyText, { color: theme.dark ? '#ccc' : '#666' }]}>
                  Nenhum aluno finalizou a prova ainda
                </ThemedText>
              </ThemedView>
            }
          />
        </ThemedView>
      </ScrollView>

      {/* Modal detalhe */}
      <Modal visible={!!selected} animationType="slide">
        <ThemedView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <ThemedView style={[styles.modalHeader, { borderBottomColor: theme.dark ? '#333' : '#e0e0e0' }]}>
            <ThemedView style={styles.modalHeaderContent}>
              <ThemedText type="title" style={[styles.modalTitle, { color: theme.colors.text }]}>
                {selected?.nome}
              </ThemedText>
              {notasGerais[selected?.id || ''] !== undefined && (
                <ThemedView style={[styles.notaGeralModalBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#e8f5e8' }]}>
                  <ThemedText style={[styles.notaGeralModalTexto, { color: theme.dark ? '#4caf50' : '#2e7d32' }]}>
                    Nota Geral: {notasGerais[selected?.id || '']}/10
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
            <Pressable onPress={() => setSelected(null)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </ThemedView>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {iaLoading && (
              <ThemedView style={[styles.iaLoadingBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#f0f8ff', borderColor: theme.dark ? '#444' : '#ddd' }]}>
                <ActivityIndicator size="small" color={theme.dark ? '#9c27b0' : '#9c27b0'} />
                <ThemedText style={[styles.iaLoadingText, { color: theme.colors.text }]}>
                  IA avaliando questões discursivas...
                </ThemedText>
              </ThemedView>
            )}
            
            {/* Estatísticas da prova */}
            <ThemedView style={[styles.estatisticasBox, { backgroundColor: theme.dark ? '#1a1a1a' : '#fafafa', borderColor: theme.dark ? '#333' : '#e0e0e0' }]}>
              <ThemedText style={[styles.estatisticasTitulo, { color: theme.colors.text }]}>
                Estatísticas da Prova
              </ThemedText>
              <ThemedView style={styles.estatisticasGrid}>
                <ThemedView style={styles.estatisticaItem}>
                  <ThemedText style={[styles.estatisticaLabel, { color: theme.dark ? '#aaa' : '#666' }]}>
                    Total de Questões
                  </ThemedText>
                  <ThemedText style={[styles.estatisticaValor, { color: theme.dark ? '#4a90e2' : '#0a7ea4' }]}>
                    {questoes.length}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.estatisticaItem}>
                  <ThemedText style={[styles.estatisticaLabel, { color: theme.dark ? '#aaa' : '#666' }]}>
                    Objetivas
                  </ThemedText>
                  <ThemedText style={[styles.estatisticaValor, { color: theme.dark ? '#4a90e2' : '#0a7ea4' }]}>
                    {questoes.filter(q => q.tipo === 'objetiva').length}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.estatisticaItem}>
                  <ThemedText style={[styles.estatisticaLabel, { color: theme.dark ? '#aaa' : '#666' }]}>
                    Discursivas
                  </ThemedText>
                  <ThemedText style={[styles.estatisticaValor, { color: theme.dark ? '#4a90e2' : '#0a7ea4' }]}>
                    {questoes.filter(q => q.tipo === 'discursiva').length}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.estatisticaItem}>
                  <ThemedText style={[styles.estatisticaLabel, { color: theme.dark ? '#aaa' : '#666' }]}>
                    Nota Geral
                  </ThemedText>
                  <ThemedText style={[styles.estatisticaValor, { color: theme.dark ? '#4caf50' : '#2e7d32' }]}>
                    {notasGerais[selected?.id || ''] || 0}/10
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>
            
            <ThemedView style={styles.questoesSection}>
              <ThemedText style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Questões ({questoes.length})
              </ThemedText>
              
              {questoes.map((q,index)=>{
                const respObj = respostasAluno[q.id];
                const textoResp = typeof respObj==='object'?respObj.texto:respObj;
                const corretaAlt = q.tipo==='objetiva'? (q.alternativas||[]).find((a:any)=> typeof a==='object'? a.correta : a===q.respostaCorreta):null;
                
                // Verifica se acertou considerando diferentes estruturas de resposta
                let acertouObj = false;
                if (q.tipo === 'objetiva') {
                  if (typeof respObj === 'object' && respObj !== null) {
                    // Resposta é objeto (pode ter id ou texto)
                    acertouObj = respObj.id ? 
                      (corretaAlt?.id === respObj.id) : 
                      (corretaAlt?.texto === respObj.texto);
                  } else if (typeof respObj === 'string') {
                    // Resposta é string
                    acertouObj = typeof corretaAlt === 'object' ? 
                      (corretaAlt.texto === respObj) : 
                      (corretaAlt === respObj);
                  }
                }
                
                const nota = notas[q.id]??'';
                const setNota=(v:string)=>setNotas(p=>({...p,[q.id]:v}));
                
                return (
                  <Pressable key={q.id} onPress={()=>setDetalhe({questao:q,respostaAluno:respObj})}> 
                    <ThemedView style={[
                      styles.questaoCard,
                      { 
                        backgroundColor: theme.dark ? '#1a1a1a' : '#fafafa',
                        borderColor: theme.dark ? '#333' : '#e0e0e0'
                      }
                    ]}> 
                      <ThemedView style={styles.questaoHeader}>
                        <ThemedText style={[styles.questaoNumero, { color: theme.dark ? '#4a90e2' : '#0a7ea4' }]}>
                          {index + 1}.
                        </ThemedText>
                        <ThemedText style={[styles.questaoTexto, { color: theme.colors.text }]}>
                          {q.texto}
                        </ThemedText>
                      </ThemedView>

                      {q.tipo==='discursiva'? (
                        <ThemedView style={styles.respostaSection}>
                          <ThemedText style={[styles.respostaLabel, { color: theme.colors.text }]}>
                            Resposta do aluno:
                          </ThemedText>
                          <ThemedView style={[styles.respostaBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#fff', borderColor: theme.dark ? '#444' : '#ddd' }]}>
                            <ThemedText style={[styles.respostaTexto, { color: theme.colors.text }]}>
                              {textoResp || 'Sem resposta'}
                            </ThemedText>
                          </ThemedView>
                          
                          <ThemedText style={[styles.notaLabel, { color: theme.colors.text }]}>
                            Nota (0-10):
                          </ThemedText>
                          <TextInput 
                            placeholder="0" 
                            placeholderTextColor='#666' 
                            value={nota} 
                            onChangeText={setNota} 
                            keyboardType="numeric" 
                            style={[
                              styles.notaInput,
                              {
                                color: theme.colors.text, 
                                backgroundColor: theme.dark ? '#2a2a2a' : '#fff', 
                                borderColor: theme.dark ? '#444' : '#ddd'
                              }
                            ]}
                          />
                          
                          {comentarios[q.id] && (
                            <ThemedView style={[styles.comentarioBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#f0f8ff' }]}>
                              <ThemedText style={[styles.comentarioTexto, { color: theme.colors.text, fontStyle: 'italic' }]}>
                                {comentarios[q.id]}
                              </ThemedText>
                            </ThemedView>
                          )}
                        </ThemedView>
                      ) : (
                        <ThemedView style={styles.respostaSection}>
                          <ThemedText style={[styles.respostaLabel, { color: theme.colors.text }]}>
                            Resposta do aluno:
                          </ThemedText>
                          <ThemedView style={[styles.respostaBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#fff', borderColor: theme.dark ? '#444' : '#ddd' }]}>
                            <ThemedText style={[styles.respostaTexto, { color: theme.colors.text }]}>
                              {textoResp || 'Sem resposta'}
                            </ThemedText>
                          </ThemedView>
                          
                          <ThemedView style={[styles.resultadoBox, { backgroundColor: acertouObj ? 'rgba(76,175,80,0.15)' : 'rgba(229,57,53,0.15)' }]}>
                            <Ionicons 
                              name={acertouObj ? "checkmark-circle" : "close-circle"} 
                              size={20} 
                              color={acertouObj ? '#4caf50' : '#e53935'} 
                            />
                            <ThemedText style={[styles.resultadoTexto, { color: acertouObj ? '#4caf50' : '#e53935' }]}>
                              {acertouObj ? 'Acertou' : 'Errou'}
                            </ThemedText>
                          </ThemedView>
                          
                          {!acertouObj && (
                            <ThemedView style={styles.gabaritoBox}>
                              <ThemedText style={[styles.gabaritoLabel, { color: theme.colors.text }]}>
                                Resposta correta:
                              </ThemedText>
                              <ThemedText style={[styles.gabaritoTexto, { color: '#4caf50' }]}>
                                {typeof corretaAlt==='object' ? corretaAlt.texto : corretaAlt}
                              </ThemedText>
                            </ThemedView>
                          )}
                        </ThemedView>
                      )}
                    </ThemedView>
                  </Pressable>
                );
              })}
            </ThemedView>

            {/* Botões de ação */}
            <ThemedView style={styles.actionButtons}>
              <Pressable 
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.dark ? '#4a90e2' : '#0a7ea4' },
                  saving && styles.disabledButton
                ]} 
                onPress={salvarNotas} 
                disabled={saving}
              >
                <Ionicons name="save" size={20} color="#fff" />
                <ThemedText style={styles.buttonText}>
                  {saving ? 'Salvando...' : 'Salvar Notas'}
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ScrollView>

          {/* Botão FAB fixo */}
          {
            questoes.filter(q=>q.tipo==='discursiva').length>0 && (
              <Pressable 
              style={[
              styles.fab,
              { backgroundColor: theme.dark ? '#9c27b0' : '#9c27b0' },
              (!keyGoogle || saving || iaLoading) && styles.disabledButton
            ]} 
            disabled={!keyGoogle || saving || iaLoading} 
            onPress={async()=>{
              const disc:DiscursivaCorrigir[] = questoes.filter(q=>q.tipo==='discursiva').map(q=>({
                id:q.id,
                texto:q.texto,
                respostaCorreta:q.respostaCorreta||'',
                respostaAluno: (typeof respostasAluno[q.id]==='object'?respostasAluno[q.id].texto:respostasAluno[q.id])||''
              }));
              if (!disc.length) return;
              
              setIaLoading(true);
              try{
                const res = await corrigirDiscursivasIA(disc,keyGoogle);
                const map:Record<string,string> = {};
                const com:Record<string,string> = {};
                res.forEach(r=>{map[r.id]=String(r.nota); if(r.comentario) com[r.id]=r.comentario;});
                setNotas(p=>({...p,...map}));
                setComentarios(p=>({...p,...com}));
                
                // Salva automaticamente no banco de dados
                await salvarNotasIA(map, com);
              }catch(e){
                console.log(e); //TODO: tratar erro
              }finally{
                setIaLoading(false);
              }
            }}
            >
            {iaLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="sparkles" size={20} color="#fff" />
            )}
            </Pressable>
          )}
        </ThemedView>
      </Modal>

      {/* Detalhe Questão Modal*/}
      <Modal visible={!!detalhe} animationType="slide" onRequestClose={()=>setDetalhe(null)}>
        {detalhe && (
          <ThemedView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <ThemedView style={[styles.modalHeader, { borderBottomColor: theme.dark ? '#333' : '#e0e0e0' }]}>
              <ThemedText type="title" style={[styles.modalTitle, { color: theme.colors.text }]}>
                Detalhes da Questão
              </ThemedText>
              <Pressable onPress={()=>setDetalhe(null)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </ThemedView>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <ThemedView style={[styles.detalheCard, { backgroundColor: theme.dark ? '#1a1a1a' : '#fafafa' }]}>
                <ThemedText style={[styles.detalheTitulo, { color: theme.colors.text }]}>
                  Questão
                </ThemedText>
                <ThemedText style={[styles.detalheTexto, { color: theme.colors.text }]}>
                  {detalhe.questao.texto}
                </ThemedText>
                
                {detalhe.questao.tipo==='objetiva'? (
                  <ThemedView style={styles.alternativasDetalhe}>
                    <ThemedText style={[styles.detalheTitulo, { color: theme.colors.text }]}>
                      Alternativas:
                    </ThemedText>
                    {(detalhe.questao.alternativas||[]).map((a:any,idx:number)=>{
                      const texto = typeof a==='string'?a:a.texto;
                      const correta = typeof a==='object'?a.correta: a===detalhe.questao.respostaCorreta;
                      const selecionada = typeof detalhe.respostaAluno==='object'? detalhe.respostaAluno.id===a.id : texto===detalhe.respostaAluno;
                      return (
                        <ThemedView 
                          key={idx} 
                          style={[
                            styles.alternativaDetalhe,
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
                          <ThemedText style={[styles.alternativaDetalheTexto, { color: theme.colors.text }]}>
                            {String.fromCharCode(65+idx)}. {texto}
                          </ThemedText>
                        </ThemedView>
                      );
                    })}
                  </ThemedView>
                ) : (
                  <ThemedView style={styles.discursivaDetalhe}>
                    <ThemedText style={[styles.detalheTitulo, { color: theme.colors.text }]}>
                      Resposta do aluno:
                    </ThemedText>
                    <ThemedView style={[styles.respostaDetalheBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#fff', borderColor: theme.dark ? '#444' : '#ddd' }]}>
                      <ThemedText style={[styles.respostaDetalheTexto, { color: theme.colors.text }]}>
                        {typeof detalhe.respostaAluno==='object'?detalhe.respostaAluno.texto:detalhe.respostaAluno || 'Sem resposta'}
                      </ThemedText>
                    </ThemedView>
                    
                    <ThemedText style={[styles.detalheTitulo, { color: theme.colors.text }]}>
                      Gabarito:
                    </ThemedText>
                    <ThemedView style={[styles.gabaritoDetalheBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#f0f8ff', borderColor: theme.dark ? '#444' : '#ddd' }]}>
                      <ThemedText style={[styles.gabaritoDetalheTexto, { color: '#4caf50' }]}>
                        {detalhe.questao.respostaCorreta || 'Não definido'}
                      </ThemedText>
                    </ThemedView>

                    {/* Nota e comentário da IA */}
                    {typeof detalhe.respostaAluno==='object' && detalhe.respostaAluno.nota !== undefined && (
                      <>
                        <ThemedText style={[styles.detalheTitulo, { color: theme.colors.text }]}>
                          Nota: {detalhe.respostaAluno.nota}/10
                        </ThemedText>
                        {detalhe.respostaAluno.comentario && (
                          <>
                            <ThemedText style={[styles.detalheTitulo, { color: theme.colors.text }]}>
                              Comentário da IA:
                            </ThemedText>
                            <ThemedView style={[styles.comentarioDetalheBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#f0f8ff', borderColor: theme.dark ? '#444' : '#ddd' }]}>
                              <ThemedText style={[styles.comentarioDetalheTexto, { color: theme.colors.text, fontStyle: 'italic' }]}>
                                {detalhe.respostaAluno.comentario}
                              </ThemedText>
                            </ThemedView>
                          </>
                        )}
                      </>
                    )}
                  </ThemedView>
                )}
              </ThemedView>
            </ScrollView>
          </ThemedView>
        )}
      </Modal>
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
    flex: 1,
  },
  alunosSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  alunoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 60,
  },
  alunoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  alunoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
  },
  alunoNome: {
    fontSize: 16,
    fontWeight: '500',
  },
  notaGeralBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  notaGeralTexto: {
    fontSize: 14,
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
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  questoesSection: {
    gap: 16,
    backgroundColor: 'transparent',
  },
  questaoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    minHeight: 120,
  },
  questaoHeader: {
    backgroundColor: 'transparent',
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
    textAlign: 'justify',
    flexWrap: 'wrap',
    flex: 1,
  },
  respostaSection: {
    backgroundColor: 'transparent',
    gap: 12,
  },
  respostaLabel: {
    backgroundColor: 'transparent',
    fontSize: 16,
    fontWeight: '600',
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
  notaLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  notaInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  comentarioBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    borderColor: '#ddd',
  },
  comentarioTexto: {
    fontSize: 14,
    lineHeight: 20,
  },
  resultadoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  resultadoTexto: {
    fontSize: 16,
    fontWeight: '600',
  },
  gabaritoBox: {
    gap: 4,
  },
  gabaritoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  gabaritoTexto: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    gap: 12,
    marginTop: 10,
    paddingBottom: '6%',
  },
  iaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  detalheCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  detalheTitulo: {
    fontSize: 18,
    fontWeight: '600',
  },
  detalheTexto: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'justify',
  },
  alternativasDetalhe: {
    gap: 12,
  },
  alternativaDetalhe: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  alternativaDetalheTexto: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  discursivaDetalhe: {
    gap: 12,
  },
  respostaDetalheBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
  },
  respostaDetalheTexto: {
    fontSize: 16,
    lineHeight: 22,
  },
  gabaritoDetalheBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
  },
  gabaritoDetalheTexto: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  iaLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  iaLoadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  comentarioDetalheBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  comentarioDetalheTexto: {
    fontSize: 16,
    lineHeight: 22,
  },
  notaGeralModalBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  notaGeralModalTexto: {
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: 'transparent',
    gap: 16,
  },
  estatisticaItem: {
    flex: 1,
    backgroundColor: 'transparent',
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
  alunoCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
}); 