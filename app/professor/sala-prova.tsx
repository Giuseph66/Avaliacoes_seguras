import DataHoraPicker from '@/components/DataHoraPicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { firestore } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Clipboard, Dimensions, Modal, Pressable, ScrollView, Share, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH;
const MAP_HEIGHT = SCREEN_HEIGHT;
const STEP = 5;
const COLORS = ['#111', '#0a7ea4', '#e53935', '#43a047', '#fbc02d', '#8e24aa', '#3949ab'];
const SIZE = SCREEN_WIDTH * 0.05;

// Tipos auxiliares
type AlunoSala = { id: string, nome: string, cor?: string };
type Block = { id: string, nome: string, color: string, x: number, y: number, dx: number, dy: number };

function MovingSquare({ color = '#0a7ea4', x = 0, y = 0, nome = '' }) {
  return (
    <View style={{ position: 'absolute', left: x, top: y, alignItems: 'center', width: SIZE }}>
      <View style={{ width: SIZE, height: SIZE, backgroundColor: color, borderRadius: 2, borderWidth: 1, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' }} />
      <ThemedText style={{ fontSize: 13, color: color, fontWeight: 'bold', marginTop: 2 ,textAlign: 'center' ,width: 60 , backgroundColor: 'transparent'}}>
        {nome && nome.length > 10 ? `${nome.slice(0, 7)}...` : nome}
      </ThemedText>
    </View>
  );
}

function useAnimatedBlocks(alunos: AlunoSala[]): Block[] {
  const [blocks, setBlocks] = React.useState<Block[]>([]);

  // Adiciona/atualiza/remover blocos conforme mudanças em alunos
  React.useEffect(() => {
    setBlocks(prev => {
      let updated = [...prev];
      // Adiciona novos
      alunos.forEach((a, i) => {
        const idx = updated.findIndex(b => b.id === a.id);
        if (idx === -1) {
          // Novo bloco
          const angle = Math.random() * 2 * Math.PI;
          updated.push({
            id: a.id,
            nome: a.nome,
            color: a.cor || COLORS[i % COLORS.length],
            x: Math.random() * (MAP_WIDTH - SIZE),
            y: Math.random() * (MAP_HEIGHT - SIZE),
            dx: Math.cos(angle),
            dy: Math.sin(angle),
          });
        } else {
          // Atualiza nome/cor se mudou
          if (updated[idx].nome !== a.nome || updated[idx].color !== (a.cor || COLORS[i % COLORS.length])) {
            updated[idx] = { ...updated[idx], nome: a.nome, color: a.cor || COLORS[i % COLORS.length] };
          }
        }
      });
      // Remove blocos de quem saiu
      updated = updated.filter(b => alunos.some(a => a.id === b.id));
      return updated;
    });
  }, [alunos.length, alunos.map(a => a.id).join(','), alunos.map(a => a.nome).join(','), alunos.map(a => a.cor).join(',')]);

  // Movimento local
  const moveInterval = useRef<any>(null);
  React.useEffect(() => {
    if (!blocks.length) return;
    if (moveInterval.current) clearInterval(moveInterval.current);
    moveInterval.current = setInterval(() => {
      setBlocks((prev: Block[]) => {
        let next = prev.map(b => ({ ...b }));
        // mover
        next.forEach(b => {
          b.x += b.dx * STEP;
          b.y += b.dy * STEP;
          if (b.x < 0 || b.x > MAP_WIDTH - SIZE) {
            b.dx = -b.dx;
            b.x = Math.max(0, Math.min(MAP_WIDTH - SIZE, b.x));
          }
          if (b.y < 0 || b.y > MAP_HEIGHT - SIZE) {
            b.dy = -b.dy;
            b.y = Math.max(0, Math.min(MAP_HEIGHT - SIZE, b.y));
          }
        });
        // colisão entre blocos
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i];
            const b = next[j];
            if (
              a.x < b.x + SIZE &&
              a.x + SIZE > b.x &&
              a.y < b.y + SIZE &&
              a.y + SIZE > b.y
            ) {
              // Rebote realista
              const ax = a.x + SIZE / 2;
              const ay = a.y + SIZE / 2;
              const bx = b.x + SIZE / 2;
              const by = b.y + SIZE / 2;
              const dx = ax - bx;
              const dy = ay - by;
              if (Math.abs(dx) > Math.abs(dy)) {
                a.dx = -a.dx;
                b.dx = -b.dx;
              } else {
                a.dy = -a.dy;
                b.dy = -b.dy;
              }
              a.x += a.dx * STEP;
              a.y += a.dy * STEP;
              b.x += b.dx * STEP;
              b.y += b.dy * STEP;
            }
          }
        }
        return next;
      });
    }, 30);
    return () => { if (moveInterval.current) clearInterval(moveInterval.current); };
  }, [blocks.length]);
  return blocks;
}

export default function SalaProva() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const [salaId, setSalaId] = useState<string | null>(null);
  const [status, setStatus] = useState<'aberta' | 'liberada' | 'fechada'>('aberta');
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [professor, setProfessor] = useState<any>(null);
  // Configurações da sala
  const [instrucoes, setInstrucoes] = useState('');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [players, setPlayers] = useState<AlunoSala[]>([]);
  const blocks = useAnimatedBlocks(players);
  const [showExpulsosModal, setShowExpulsosModal] = useState(false);
  const [alunosExpulsos, setAlunosExpulsos] = useState<any[]>([]);
  const [showForaSalaModal, setShowForaSalaModal] = useState(false);
  const [alunosForaSala, setAlunosForaSala] = useState<any[]>([]);
  const [alunosProva, setAlunosProva] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [dataHora, setDataHora] = useState<Date | null>(null);
  const [dataHoraCarregada, setDataHoraCarregada] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('usuarioLogado').then(data => {
      if (data) setProfessor(JSON.parse(data));
    });
  }, []);

  useEffect(() => {
    console.log(params);
    if (!params.provaId || !professor) {
      setLoading(false);
      return;
    }
    let unsubSala: any;
    let unsubAlunos: any;
    (async () => {
      // Busca sala existente
      let salaDocId = null;
      const salaRef = doc(firestore, 'salas', `${params.provaId}_${professor.id}`);
      const snapshot = await getDoc(salaRef);
      if (snapshot.exists()) {
        salaDocId = snapshot.id;
        // Carrega configs existentes
        const data = snapshot.data();
        setInstrucoes(data.instrucoes || '');
      } else {
        // Cria sala
        await setDoc(salaRef, {
          provaId: params.provaId,
          professorId: professor.id,
          status: 'aberta',
          alunos: [],
          instrucoes,
          criadoEm: new Date()
        });
        salaDocId = `${params.provaId}_${professor.id}`;
      }
      setSalaId(salaDocId);
      // Listener em tempo real
      unsubSala = onSnapshot(salaRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStatus(data.status);
          setInstrucoes(data.instrucoes || '');
          
          // Carrega a data/hora da prova - prioriza fimProva, depois dataHora
          if (data.fimProva) {
            console.log('Carregando fimProva:', data.fimProva);
            console.log('Tipo do fimProva:', typeof data.fimProva);
            console.log('fimProva.seconds:', data.fimProva.seconds);
            console.log('fimProva.nanoseconds:', data.fimProva.nanoseconds);
            
            // Converte timestamp do Firestore para Date
            let dataConvertida;
            if (data.fimProva.seconds) {
              // Se tem seconds, é um Timestamp do Firestore
              dataConvertida = new Date(data.fimProva.seconds * 1000);
            } else if (data.fimProva.toDate) {
              // Se tem toDate(), é um Timestamp do Firestore
              dataConvertida = data.fimProva.toDate();
            } else {
              // Se não tem nenhum, tenta converter diretamente
              dataConvertida = new Date(data.fimProva);
            }
            
            console.log('Data convertida:', dataConvertida);
            console.log('Data convertida ISO:', dataConvertida.toISOString());
            setDataHora(dataConvertida);
            setDataHoraCarregada(true);
          } else if (data.dataHora) {
            console.log('Carregando dataHora:', data.dataHora);
            let dataConvertida;
            if (data.dataHora.seconds) {
              dataConvertida = new Date(data.dataHora.seconds * 1000);
            } else if (data.dataHora.toDate) {
              dataConvertida = data.dataHora.toDate();
            } else {
              dataConvertida = new Date(data.dataHora);
            }
            setDataHora(dataConvertida);
            setDataHoraCarregada(true);
          } else {
            console.log('Nenhuma data encontrada');
            setDataHora(null);
            setDataHoraCarregada(true);
          }
        }
        setLoading(false);
      });
      // Listener para subcoleção de alunos
      unsubAlunos = onSnapshot(collection(firestore,'salas',String(salaDocId),'alunos'), (snap)=>{
        const arr = snap.docs.map(d=>d.data());
        setAlunos(arr);
      });
    })();
    return () => { 
      if (unsubSala) unsubSala(); 
      if (unsubAlunos) unsubAlunos(); 
    };
  }, [params.provaId, professor]);

  // Listener de players (subcoleção), igual ao aluno
  useEffect(() => {
    if (!salaId) return;
    const q = collection(firestore, 'salas', String(salaId), 'players');
    const unsub = onSnapshot(q, (snap) => {
      const playersArr = snap.docs.map(doc => {
        const d = doc.data();
        return { id: d.id, nome: d.nome, cor: d.cor };
      });
      setPlayers(playersArr.sort((a, b) => a.nome.localeCompare(b.nome)));
    });
    return () => unsub();
  }, [salaId]);

  // Filtrar alunos expulsos
  useEffect(() => {
    const expulsos = alunos.filter(aluno => aluno.status === 'expulso');
    setAlunosExpulsos(expulsos);
    const foraSala = alunos.filter(aluno => aluno.status === 'fora_sala');
    setAlunosForaSala(foraSala);
    const emProva = alunos.filter(aluno => aluno.status === 'prova');
    setAlunosProva(emProva);
  }, [alunos]);

  async function salvarDataHora() {
    if (!salaId || !dataHora) return;
    await updateDoc(doc(firestore, 'salas', salaId), { fimProva: dataHora });
    Alert.alert('Data e hora salvas!');
  }

  // Função para verificar se pode modificar a sala
  function verificarPermissaoModificacao() {
    if (status === 'fechada') {
      Alert.alert(
        'Sala Fechada',
        'A sala deve estar aberta para poder modificar as configurações.',
        [{ text: 'OK', style: 'default' }]
      );
      return false;
    }
    return true;
  }

  // Função para salvar configurações com verificação
  async function salvarConfiguracoesComVerificacao(date?: Date | null) {
    if (!verificarPermissaoModificacao()) return;
    
    setLoadingConfig(true);
    if (!salaId) return;
    await updateDoc(doc(firestore, 'salas', salaId), {
      instrucoes,
      fimProva: date || dataHora || null,
    });
    setLoadingConfig(false);
    Alert.alert('Configurações salvas!');
  }

  async function liberarSala() {
    if (!salaId) return;
    if (!dataHora) {
      Alert.alert('Preencha a data e hora de término da prova antes de liberar!');
      return;
    }
    if (!instrucoes || instrucoes.trim().length === 0) {
      Alert.alert('Preencha as instruções para o aluno antes de liberar!');
      return;
    }
    await updateDoc(doc(firestore, 'salas', salaId), {
      status: 'liberada',
      fimProva: dataHora,
      instrucoes,
    });
  }
  async function fechar_abrirSala() {
    if (!salaId) return;
    if (status === 'fechada') {
      await updateDoc(doc(firestore, 'salas', salaId), { status: 'aberta' });
    } else {
      await updateDoc(doc(firestore, 'salas', salaId), { status: 'fechada' });
    }
  }

  async function handleShare() {
    if (!salaId) return;
    try {
      await Share.share({ message: `Acesse a sala de prova: ${salaId}` });
    } catch (e) {
      console.log(e);
    }
  }
  function handleCopy() {
    if (!salaId) return;
    Clipboard.setString(salaId);
  }

  if (!params.provaId) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
        <ThemedText style={{ color: theme.colors.text }}>Selecione uma prova para abrir a sala.</ThemedText>
      </ThemedView>
    );
  }
  async function removerAluno(id: string, nome: string) {
    if (!salaId) return;
    
    if (status === 'fechada') {
      Alert.alert(
        'Sala Fechada',
        'A sala deve estar aberta para poder expulsar alunos.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    // Primeiro, marca como expulso
    await setDoc(doc(firestore, 'salas', String(salaId), 'alunos', id), { id, nome, status: 'expulso' });
    // Depois remove dos players
    await deleteDoc(doc(firestore,'salas',String(salaId),'players',id));
  }
  async function liberarAluno(id: string, nome: string) {
    if (!salaId) return;
    await deleteDoc(doc(firestore,'salas',String(salaId),'alunos',id));
    Alert.alert('Sucesso', 'Aluno liberado para fazer a prova novamente!');
  }
  async function liberarAlunoForaSala(id: string, nome: string) {
    if (!salaId) return;
    await deleteDoc(doc(firestore,'salas',String(salaId),'alunos',id));
    Alert.alert('Sucesso', 'Aluno liberado para retornar à prova!');
  }
  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      {/* Bloquinhos animados de fundo */}
      <View style={{ position: 'absolute', width: MAP_WIDTH, height: MAP_HEIGHT, left: 0, top: 0, zIndex: 0 }} pointerEvents="none">
        {blocks.map(b => (
          <MovingSquare key={b.id} color={b.color} x={b.x} y={b.y} nome={b.nome} />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={{ color: theme.colors.text }}>Sala de Prova</ThemedText>
        {loading ? (
          <ThemedText style={{ color: theme.colors.text }}>Carregando...</ThemedText>
        ) : (
          <>
            <ThemedText style={{ color: theme.colors.text, marginTop: 8 }}>Código da sala:</ThemedText>
            <ThemedText style={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 18 }}>{salaId}</ThemedText>
            {/* QRCode só se salaId existir */}
            {typeof salaId === 'string' && salaId.length > 0 && (
              <ThemedView
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                  borderWidth: 1,
                  borderRadius: 16,
                  borderColor: colors.icon,
                  backgroundColor: colors.background,
                  alignSelf: 'center',
                  marginVertical: 16,
                }}
              >
                <QRCode value={salaId} size={220} color={colors.text} backgroundColor={colors.background} />
              </ThemedView>
            )}
            <ThemedText style={{ color: theme.colors.text, marginTop: 8, marginBottom: 8, textAlign: 'center' }}>
              Escaneie o QR-Code com o aplicativo do aluno ou compartilhe o código abaixo.
            </ThemedText>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.tint, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, marginRight: 8, backgroundColor: colors.background }} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={20} color={colors.tint} />
                <ThemedText style={{ color: colors.tint, fontWeight: '600', marginLeft: 8 }}>Compartilhar</ThemedText>
              </Pressable>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.tint, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: colors.background }} onPress={handleCopy}>
                <Ionicons name="copy-outline" size={20} color={colors.tint} />
                <ThemedText style={{ color: colors.tint, fontWeight: '600', marginLeft: 8 }}>Copiar</ThemedText>
              </Pressable>
            </View>
            <ThemedText style={{ color: theme.colors.text, marginBottom: 4 }}>Alunos em espera: {players.length}</ThemedText>
            <ThemedText style={{ color: theme.colors.text, marginBottom: 8 }}>Alunos em prova: {alunosProva.length}</ThemedText>
            <ThemedText style={{ color: theme.colors.text, fontSize: 12, marginBottom: 8, fontStyle: 'italic' }}>
              Clique no nome do aluno para expulsá-lo da sala
            </ThemedText>
            <View style={styles.alunosList}>
              {players.map((a, i) => (
                <Pressable 
                  key={i} 
                  onPress={() => removerAluno(a.id, a.nome)}
                  disabled={status === 'fechada'}
                >
                  <ThemedText 
                    style={[
                      { 
                        color: theme.colors.text,
                        fontWeight: 'bold', 
                        fontSize: 16, 
                        backgroundColor: 'rgba(105, 105, 105, 0.3)', 
                        padding: 8, 
                        borderRadius: 8,
                        opacity: status === 'fechada' ? 0.6 : 1
                      }
                    ]}
                  >
                    {a.nome || a.id}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            
            {/* Botão para ver alunos fora da sala */}
            {alunosForaSala.length > 0 && (
              <Pressable 
                style={[styles.button, { backgroundColor: '#03A9F4', marginBottom: 16 }]} 
                onPress={() => setShowForaSalaModal(true)}
              >
                <ThemedText style={styles.buttonText}>
                  Alunos Fora da Sala ({alunosForaSala.length})
                </ThemedText>
              </Pressable>
            )}
            
            {/* Botão para ver alunos expulsos */}
            {alunosExpulsos.length > 0 && (
              <Pressable 
                style={[styles.button, { backgroundColor: '#ff9800', marginBottom: 16 }]} 
                onPress={() => setShowExpulsosModal(true)}
              >
                <ThemedText style={styles.buttonText}>
                  Alunos Expulsos ({alunosExpulsos.length})
                </ThemedText>
              </Pressable>
            )}
            
            {/* Modal alunos fora da sala */}
            <Modal visible={showForaSalaModal} animationType="slide" transparent onRequestClose={() => setShowForaSalaModal(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: theme.colors.background, borderRadius: 16, padding: 24, width: '90%', maxWidth: 400, maxHeight: '80%' }}>
                  <ThemedText type="title" style={{ color: theme.colors.text, marginBottom: 16, textAlign: 'center' }}>
                    Alunos Fora da Sala
                  </ThemedText>

                  <ScrollView style={{ maxHeight: 600 , minHeight: 100}}>
                    {alunosForaSala.length > 0 ? (
                      alunosForaSala.map((aluno, index) => (
                        <View key={index} style={styles.alunoExpulsoItem}>
                          <ThemedText style={{ color: theme.colors.text, fontSize: 16, fontWeight: 'bold' }}>
                            {aluno.nome}
                          </ThemedText>
                          <ThemedText style={{ color: '#03A9F4', fontSize: 14 }}>
                            Fora da Sala
                          </ThemedText>
                          <Pressable
                            style={{ marginLeft: 12, backgroundColor: '#4caf50', padding: 8, borderRadius: 6 }}
                            onPress={() => liberarAlunoForaSala(aluno.id, aluno.nome)}
                          >
                            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Liberar</ThemedText>
                          </Pressable>
                        </View>
                      ))
                    ) : (
                      <ThemedText style={{ color: theme.colors.text, textAlign: 'center', fontStyle: 'italic' }}>
                        Nenhum aluno fora da sala
                      </ThemedText>
                    )}
                  </ScrollView>

                  <Pressable 
                    style={[styles.button, { backgroundColor: '#666', minHeight: 40, justifyContent: 'center', marginTop: 16 ,padding: 0}]} 
                    onPress={() => setShowForaSalaModal(false)}
                  >
                    <ThemedText style={{color: '#fff', fontWeight: 'bold'}}>Fechar</ThemedText>
                  </Pressable>
                </View>
              </View>
            </Modal>
            
            {/* Modal de alunos expulsos */}
            <Modal visible={showExpulsosModal} animationType="slide" transparent onRequestClose={() => setShowExpulsosModal(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: theme.colors.background, borderRadius: 16, padding: 24, width: '90%', maxWidth: 400, maxHeight: '80%' }}>
                  <ThemedText type="title" style={{ color: theme.colors.text, marginBottom: 16, textAlign: 'center' }}>
                    Alunos Expulsos
                  </ThemedText>
                  
                  <ScrollView style={{ maxHeight: 600 , minHeight: 100}}>
                    {alunosExpulsos.length > 0 ? (
                      alunosExpulsos.map((aluno, index) => (
                        <View key={index} style={styles.alunoExpulsoItem}>
                          <ThemedText style={{ color: theme.colors.text, fontSize: 16, fontWeight: 'bold' }}>
                            {aluno.nome}
                          </ThemedText>
                          <ThemedText style={{ color: '#ff6b6b', fontSize: 14 }}>
                            Expulso
                          </ThemedText>
                          <Pressable
                            style={{ marginLeft: 12, backgroundColor: '#4caf50', padding: 8, borderRadius: 6 }}
                            onPress={() => liberarAluno(aluno.id, aluno.nome)}
                          >
                            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Liberar</ThemedText>
                          </Pressable>
                        </View>
                      ))
                    ) : (
                      <ThemedText style={{ color: theme.colors.text, textAlign: 'center', fontStyle: 'italic' }}>
                        Nenhum aluno expulso
                      </ThemedText>
                    )}
                  </ScrollView>
                  
                  <Pressable 
                    style={[styles.button, { backgroundColor: '#666', minHeight: 40, justifyContent: 'center', marginTop: 16 ,padding: 0}]} 
                    onPress={() => setShowExpulsosModal(false)}
                  >
                    <ThemedText style={{color: '#fff', fontWeight: 'bold'}}>Fechar</ThemedText>
                  </Pressable>
                </View>
              </View>
            </Modal>
            
            {/* Configurações da sala */}
            <View style={styles.configBox}>
              {loadingConfig ? (
                <ThemedText style={{ color: theme.colors.text, marginBottom: 4 }}>Salvando...</ThemedText>
              ) : (
                <>
                  {status === 'fechada' && (
                    <ThemedView style={[styles.salaFechadaBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#fff3cd', borderColor: theme.dark ? '#444' : '#ffeaa7' }]}>
                      <Ionicons name="lock-closed" size={20} color={theme.dark ? '#ff9800' : '#856404'} />
                      <ThemedText style={[styles.salaFechadaTexto, { color: theme.dark ? '#ff9800' : '#856404' }]}>
                        Sala fechada - Apenas visualização
                      </ThemedText>
                    </ThemedView>
                  )}
                  <ThemedText style={{ color: theme.colors.text, marginBottom: 4 }}>Data e hora de término da prova:</ThemedText>
                  {dataHoraCarregada ? (
                    <DataHoraPicker 
                      value={dataHora} 
                      onChange={
                        (date) => {
                          console.log('DataHora selecionada no picker:', date);
                          setDataHora(date);
                          salvarConfiguracoesComVerificacao(date);
                        }
                      }
                      disabled={status === 'fechada'}
                    />
                  ) : (
                    <ThemedView style={[styles.loadingBox, { backgroundColor: theme.dark ? '#2a2a2a' : '#f5f5f5' }]}>
                      <ThemedText style={[styles.loadingText, { color: theme.dark ? '#aaa' : '#666' }]}>
                        Carregando data...
                      </ThemedText>
                    </ThemedView>
                  )}
                  <ThemedText style={{ color: theme.colors.text, marginTop: 8, marginBottom: 4 }}>Instruções para o aluno:</ThemedText>
                  <TextInput
                    value={instrucoes}
                    onChangeText={setInstrucoes}
                    style={[
                      styles.input, 
                      { 
                        color: theme.colors.text, 
                        backgroundColor: theme.dark ? '#222' : '#fff', 
                        borderColor: theme.dark ? '#444' : '#ccc', 
                        minHeight: 60,
                        opacity: status === 'fechada' ? 0.6 : 1
                      }
                    ]}
                    placeholderTextColor={theme.dark ? '#888' : '#999'}
                    multiline
                    editable={status !== 'fechada'}
                  />
                  <Pressable 
                    style={[
                      styles.button, 
                      { 
                        backgroundColor: status === 'fechada' ? '#ccc' : (theme.dark ? '#4a90e2' : '#0a7ea4'), 
                        marginTop: 8,
                        opacity: status === 'fechada' ? 0.6 : 1
                      }
                    ]} 
                    onPress={() => salvarConfiguracoesComVerificacao(dataHora || undefined)}
                    disabled={status === 'fechada'}
                  >
                    <ThemedText style={[styles.buttonText, { color: status === 'fechada' ? '#666' : '#fff' }]}>
                      {status === 'fechada' ? 'Sala Fechada' : 'Salvar Configurações'}
                    </ThemedText>
                  </Pressable>
                </>
              )}
            </View>
            <View style={styles.buttonRow}>
              {status === 'aberta' && (
                <Pressable style={[styles.button, { backgroundColor: '#4caf50' }]} onPress={liberarSala}>
                  <ThemedText style={styles.buttonText}>Liberar Prova</ThemedText>
                </Pressable>
              )}
              <Pressable style={[styles.button, { backgroundColor: status === 'fechada' ? '#4caf50' : '#d32f2f' }]} onPress={fechar_abrirSala}>
                <ThemedText style={styles.buttonText}>{status === 'aberta' || status === 'liberada' ? 'Fechar Sala' : 'Abrir Sala'}</ThemedText>
              </Pressable>
            </View>
            <ThemedText style={{ color: theme.colors.text, marginTop: 12 }}>Status: {status === 'aberta' ? 'Aguardando alunos' : status === 'liberada' ? 'Liberada para prova' : 'Fechada'}</ThemedText>

            {status === 'fechada' && (
              <Pressable
                style={[styles.button, { backgroundColor: '#0a7ea4', marginTop: 16 }]}
                onPress={() => router.push({ pathname: '/professor/corrigir-respostas', params: { salaId } } as any)}
              >
                <ThemedText style={styles.buttonText}>Corrigir Respostas</ThemedText>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 0 },
  scrollContent: { padding: 24, paddingBottom: 40 ,paddingTop: StatusBar.currentHeight},
  alunosList: { marginBottom: 16, gap: 4 ,flexDirection: 'row', flexWrap: 'wrap'},
  configBox: { marginBottom: 16, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', backgroundColor: 'rgba(0,0,0,0.03)' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
  alunoExpulsoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  salaFechadaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  salaFechadaTexto: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
}); 