import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { firestore } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Modal, Pressable, StatusBar, StyleSheet, TextInput, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH;
const MAP_HEIGHT = SCREEN_HEIGHT;
const STEP =5;
const COLORS = ['#7a6363', '#0a7ea4', '#e53935', '#43a047', '#fbc02d', '#8e24aa', '#3949ab'];
const SIZE = SCREEN_WIDTH * 0.05  ; // tamanho do quadrado

function MovingSquare({ color = '#0a7ea4', x = 0, y = 0, nome = '', fala = '' }) {
  return (
    <View style={{ position: 'absolute', left: x, top: y, alignItems: 'center', width: 44 }}>
      {fala ? (
        <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 4, marginBottom: 2, borderWidth: 1, borderColor: '#ccc', minWidth: 40 }}>
          <ThemedText style={{ fontSize: 12, color: '#222', textAlign: 'center' }}>{fala}</ThemedText>
        </View>
      ) : null}
      <View style={{ width: SIZE, height: SIZE, backgroundColor: color, borderRadius: 2, borderWidth: 1, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' }} />
      <ThemedText style={{ fontSize: 13, color: color, fontWeight: 'bold', marginTop: 2 ,textAlign: 'center' ,width: 60 , backgroundColor: 'transparent'}}>
        {nome.length > 10 ? `${nome.slice(0, 7)}...` : nome}
      </ThemedText>
    </View>
  );
}

export default function SalaEspera() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const [status, setStatus] = useState<'aberta' | 'liberada' | 'fechada'>('aberta');
  const [provaId, setProvaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [aluno, setAluno] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [fala, setFala] = useState('');
  const [localPlayers, setLocalPlayers] = useState<any[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [instrucoes, setInstrucoes] = useState('');
  const [showExpulsoModal, setShowExpulsoModal] = useState(false);

  const moveInterval = useRef<any>(null);

  // Função para escolher cor aleatória automaticamente
  async function escolherCorAutomatica() {
    console.log('escolhendo cor automatica');
    const alunos = await AsyncStorage.getItem('usuarioLogado');
    const aluno = alunos ? JSON.parse(alunos) : null;
    console.log('aluno', aluno);
    if (!aluno || !aluno.id || typeof aluno.id !== 'string') return;
    console.log('aluno', aluno);
    try {
      const corAleatoria = COLORS[Math.floor(Math.random() * COLORS.length)];
      const angle = Math.random() * 2 * Math.PI;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const x = Math.floor(Math.random()*(MAP_WIDTH-44));
      const y = Math.floor(Math.random()*(MAP_HEIGHT-44));
      
      const novo = {
        id: aluno.id,
        nome: aluno.nome || '',
        cor: corAleatoria,
        fala: '',
        x, y, dx, dy
      };

      await setDoc(doc(firestore, 'salas', String(params.salaId || ''), 'players', aluno.id), novo);
      setPlayer(novo);
    } catch (error) {
      console.error('Erro ao escolher cor automática:', error);
      Alert.alert('Erro', 'Não foi possível escolher uma cor automaticamente');
    }
  }

  // Buscar dados do aluno logado e player
  useEffect(() => {
    AsyncStorage.getItem('usuarioLogado').then(data => {
      if (data) {
        const aluno = JSON.parse(data);
        setAluno(aluno);
        // Buscar player no Firestore
        if (params.salaId) {
          // Verificar status do aluno diretamente na subcoleção
          const alunoDoc = doc(firestore, 'salas', String(params.salaId), 'alunos', aluno.id);
          const unsub = onSnapshot(alunoDoc, (snap) => {
            if (snap.exists()) {
              const alunoNaSala = snap.data();
              if (alunoNaSala.status === 'expulso' && !showExpulsoModal) {
                setShowExpulsoModal(true);
              } else if (alunoNaSala.status === 'fora_sala') {
                router.replace({ pathname: '/aluno/sala-reflexao', params: { salaId: params.salaId } } as any);
              } else {
                const playerRef = doc(firestore, 'salas', String(params.salaId), 'players', aluno.id);
                getDoc(playerRef).then(playerSnap => {
                  if (playerSnap.exists()) {
                    setPlayer(playerSnap.data());
                  } else {
                    if (alunoNaSala.status != 'expulso' && alunoNaSala.status != 'fora_sala') {
                      escolherCorAutomatica();
                    }
                  }
                });
              }
            }
          });
          return () => unsub();
        }
      }
    });
  }, [params.salaId, showExpulsoModal]);

  // Listener de status da sala
  useEffect(() => {
    if (!params.salaId) return;
    const unsub = onSnapshot(doc(firestore, 'salas', String(params.salaId)), (docSnap) => {
      if (docSnap.exists()) {
        setStatus(docSnap.data().status);
        setProvaId(docSnap.data().provaId);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [params.salaId]);

  // Listener de mensagens do chat
  useEffect(() => {
    if (!params.salaId) return;
    const q = query(collection(firestore, 'salas', String(params.salaId), 'chat'), orderBy('criadoEm'));
    const unsub = onSnapshot(q, (snap) => {
      setMensagens(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [params.salaId]);

  // Listener de players
  useEffect(() => {
    if (!params.salaId) return;
    const q = collection(firestore, 'salas', String(params.salaId), 'players');
    const unsub = onSnapshot(q, (snap) => {
      const players = snap.docs.map(doc => doc.data());
      // Corrigir players sem direção
      players.forEach(async (p: any) => {
        if ((typeof p.dx !== 'number' || typeof p.dy !== 'number') || (p.dx === 0 && p.dy === 0)) {
          const angle = Math.random() * 2 * Math.PI;
          const dx = Math.cos(angle);
          const dy = Math.sin(angle);
          await setDoc(doc(firestore, 'salas', String(params.salaId), 'players', p.id), {
            ...p,
            dx,
            dy
          });
        }
      });
      setPlayers(players.sort((a: any, b: any) => a.nome.localeCompare(b.nome)));
    });
    return () => unsub();
  }, [params.salaId]);

  // Inicializar localPlayers ao carregar players do Firestore
  useEffect(() => {
    if (!players.length) return;
    setLocalPlayers(prev => {
      // Atualiza ou adiciona players
      const updated = [...prev];
      players.forEach(p => {
        const idx = updated.findIndex(lp => lp.id === p.id);
        if (idx !== -1) {
          // Atualiza apenas nome/cor/fala
          updated[idx] = { ...updated[idx], nome: p.nome, cor: p.cor, fala: p.fala };
        } else {
          // Novo player: inicializa posição/direção aleatória local
          const angle = Math.random() * 2 * Math.PI;
          updated.push({
            ...p,
            x: Math.floor(Math.random() * (MAP_WIDTH - SIZE)),
            y: Math.floor(Math.random() * (MAP_HEIGHT - SIZE)),
            dx: Math.cos(angle),
            dy: Math.sin(angle),
          });
        }
      });
      // Remove players que saíram
      return updated.filter(lp => players.some(p => p.id === lp.id));
    });
  }, [players]);

  // Loop local para mover todos os blocos com colisão entre blocos
  useEffect(() => {
    if (!localPlayers.length) return;
    if (moveInterval.current) clearInterval(moveInterval.current);
    moveInterval.current = setInterval(() => {
      setLocalPlayers(prev => {
        let next = prev.map(p => ({ ...p }));
        // mover
        next.forEach(p => {
          p.x += p.dx * STEP;
          p.y += p.dy * STEP;
          if (p.x < 0 || p.x > MAP_WIDTH - SIZE) {
            p.dx = -p.dx;
            p.x = Math.max(0, Math.min(MAP_WIDTH - SIZE, p.x));
          }
          if (p.y < 0 || p.y > MAP_HEIGHT - SIZE) {
            p.dy = -p.dy;
            p.y = Math.max(0, Math.min(MAP_HEIGHT - SIZE, p.y));
          }
        });
        // colisão entre blocos (detecção AABB simples)
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
              // Calcula o centro de cada bloco
              const ax = a.x + SIZE / 2;
              const ay = a.y + SIZE / 2;
              const bx = b.x + SIZE / 2;
              const by = b.y + SIZE / 2;
              // Diferença
              const dx = ax - bx;
              const dy = ay - by;
              // Decide o eixo principal da colisão
              if (Math.abs(dx) > Math.abs(dy)) {
                // Rebote horizontal
                a.dx = -a.dx;
                b.dx = -b.dx;
              } else {
                // Rebote vertical
                a.dy = -a.dy;
                b.dy = -b.dy;
              }
              // Ajusta posições para não ficarem grudados
              a.x += a.dx * STEP;
              a.y += a.dy * STEP;
              b.x += b.dx * STEP;
              b.y += b.dy * STEP;
            }
          }
        }
        return next;
      });
    }, 30); // ~33 fps
    return () => { if (moveInterval.current) clearInterval(moveInterval.current); };
  }, [localPlayers.length]);

  // Função para criar player com direção aleatória
  function getRandomDirectionVec() {
    const dirs = [ [1,0], [-1,0], [0,1], [0,-1], [1,1], [-1,1], [1,-1], [-1,-1] ];
    return dirs[Math.floor(Math.random()*dirs.length)];
  }

  // Ao escolher cor, sorteia ângulo e calcula dx/dy, salva no Firestore e local
  async function escolherCor(cor: string) {
    if (!aluno) return;
    const angle = Math.random() * 2 * Math.PI;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const x = Math.floor(Math.random()*(MAP_WIDTH-44));
    const y = Math.floor(Math.random()*(MAP_HEIGHT-44));
    const novo = {
      id: aluno.id,
      nome: aluno.nome,
      cor,
      fala: '',
      x, y, dx, dy
    };
    await setDoc(doc(firestore, 'salas', String(params.salaId || ''), 'players', aluno.id), novo);
    setPlayer(novo);
    setShowColorPicker(false);
  }

  async function handleIniciarProva() {
    if (!provaId || !aluno || !params.salaId) return;
    try {
      const alunoDoc = doc(firestore, 'salas', String(params.salaId), 'alunos', aluno.id);
      console.log('Doc referência:', alunoDoc.path);
      await setDoc(alunoDoc, { id: aluno.id, nome: aluno.nome, status: 'prova' });
      console.log('Aluno registrado com sucesso!');
      await deleteDoc(doc(firestore,'salas',String(params.salaId),'players',aluno.id));
      router.replace({ pathname: '/aluno/prova-segura', params: { provaId, salaId: params.salaId } } as any);
    } catch (e) {
      console.error('Erro ao definir status prova:', e);
    }
  }

  // Enviar fala (chat balão)
  async function enviarFala() {
    if (!player || !fala.trim()) return;
    await setDoc(doc(firestore, 'salas', String(params.salaId || ''), 'players', player.id), { ...player, fala: fala.trim() });
    setFala('');
    setTimeout(async () => {
      await setDoc(doc(firestore, 'salas', String(params.salaId || ''), 'players', player.id), { ...player, fala: '' });
    }, 4000);
  }

  // Remover player do Firestore ao sair da sala
  useEffect(() => {
    return () => {
      if (aluno && params.salaId && typeof params.salaId === 'string') {
        const playerRef = doc(firestore, 'salas', params.salaId, 'players', aluno.id);
        deleteDoc(playerRef);
        console.log('player removido');
        console.log('removendo aluno da sala');
        // Remove doc do aluno na subcoleção
        // deleteDoc(doc(firestore, 'salas', params.salaId, 'alunos', aluno.id));
      }
    };
  }, [aluno, params.salaId]);

  // Listener de instruções do professor
  useEffect(() => {
    if (!params.salaId) return;
    const unsub = onSnapshot(doc(firestore, 'salas', String(params.salaId)), (docSnap) => {
      if (docSnap.exists()) {
        setInstrucoes(docSnap.data().instrucoes || '');
      }
      
    });
    return () => unsub();
  }, [params.salaId]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      {/* Botão de info no topo direito */}
      <Pressable style={{ position: 'absolute', top: StatusBar.currentHeight ?? 24, right: 18, zIndex: 10, padding: 8 }} onPress={() => setShowInfo(true)}>
        <Ionicons name="information-circle-outline" size={30} color={theme.colors.text} />
      </Pressable>
      {/* Modal de info */}
      <Modal visible={showInfo} animationType="slide" transparent onRequestClose={() => setShowInfo(false)}>
        <View style={{ flex:1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', maxWidth: 400, alignItems: 'center', elevation: 6 }}>
            <ThemedText type="title" style={{ color: '#0a7ea4', marginBottom: 12 }}>Informações da Sala</ThemedText>
            <ThemedText style={{ color: '#222', fontSize: 16, marginBottom: 16, textAlign: 'center' }}>{instrucoes ? instrucoes : 'Nenhuma instrução do professor.'}</ThemedText>
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3eaf2', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, marginBottom: 16 }} onPress={() => { setShowInfo(false); setShowColorPicker(true); }}>
              <Ionicons name="color-palette-outline" size={20} color={'#0a7ea4'} />
              <ThemedText style={{ color: '#0a7ea4', fontWeight: '600', marginLeft: 8 }}>Trocar de cor</ThemedText>
            </Pressable>
            <Pressable style={{ marginTop: 8 }} onPress={() => setShowInfo(false)}>
              <ThemedText style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: 16 }}>Fechar</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
      {/* Modal de expulsão */}
      <Modal
        visible={showExpulsoModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', width: '80%' }}>
            <Ionicons name="alert-circle" size={48} color="#d32f2f" style={{ marginBottom: 16 }} />
            <ThemedText type="title" style={{ color: '#d32f2f', marginBottom: 12, textAlign: 'center' }}>
              Você foi expulso da sala
            </ThemedText>
            <ThemedText style={{ color: '#222', fontSize: 16, marginBottom: 24, textAlign: 'center' }}>
              O professor removeu você da sala.
            </ThemedText>
            <Pressable
              style={{ backgroundColor: '#0a7ea4', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 }}
              onPress={() => {
                setShowExpulsoModal(false);
                router.replace({ pathname: '/aluno/entrar-sala', params: { salaId: params.salaId } });
              }}
            >
              <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>OK</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
      <ThemedText type="title" style={styles.title}>Sala de Espera</ThemedText>
      { loading ? (
        <ThemedText style={[styles.info, { color: theme.colors.text }]}>Carregando...</ThemedText>
      ) : status === 'fechada' ? (
        <ThemedText style={[styles.info, { color: theme.colors.text }]}>Sala encerrada pelo professor.</ThemedText>
      ) : (
        <>
        {showColorPicker && (
        <View style={styles.colorPickerBox}>
          <ThemedText style={{ color: '#000', fontSize: 16, fontWeight: 'bold', marginBottom: 12}}>Escolha sua cor:</ThemedText>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {COLORS.map(cor => (
              <Pressable key={cor} style={[styles.colorCircle, { backgroundColor: cor }]} onPress={() => escolherCor(cor)} />
            ))}
          </View>
        </View>
        )}
          <ThemedText style={[styles.info, { color: theme.colors.text }]}>Aguardando o professor liberar a prova...</ThemedText>
          {/* Mini-game mapa tela cheia */}
          <View style={styles.fullMapBox}>
            <View style={styles.mapBox}>
              {localPlayers.map(p => (
                <MovingSquare key={p.id} color={p.cor} x={p.x} y={p.y} nome={p.nome} fala={p.fala} />
              ))}
            </View>
          </View>
          {/* Fala/chat balão */}
          <View style={styles.falaRow}>
            <TextInput
              value={fala}
              onChangeText={setFala}
              placeholder="Fale algo..."
              placeholderTextColor={theme.dark ? '#888' : '#999'}
              style={[styles.msgInput, { color: theme.colors.text, backgroundColor: theme.dark ? '#222' : '#fff', borderColor: theme.dark ? '#444' : '#ccc', flex: 1 }]}
              onSubmitEditing={enviarFala}
              returnKeyType="send"
            />
            <Pressable style={[styles.msgSendBtn, { backgroundColor: theme.dark ? '#4a90e2' : '#0a7ea4' }]} onPress={enviarFala}>
              <ThemedText style={styles.msgSendText}>Falar</ThemedText>
            </Pressable>
          </View>
          {status === 'liberada' && (
            <Pressable style={[styles.button, { backgroundColor: theme.dark ? '#4caf50' : '#0a7ea4' }]} onPress={handleIniciarProva}>
              <ThemedText style={styles.buttonText}>Iniciar Prova</ThemedText>
            </Pressable>
          )}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#e3eaf2',
    paddingTop: StatusBar.currentHeight,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 22,
    fontWeight: 'bold',
  },
  info: {
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 16,
  },
  chatContainer: {
    width: '100%',
    maxWidth: 480,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    minHeight: 180,
    maxHeight: 260,
    alignSelf: 'center',
  },
  msgBubble: {
    backgroundColor: 'rgba(10,126,164,0.08)',
    borderRadius: 8,
    padding: 8,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  msgBubbleSelf: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    alignSelf: 'flex-end',
  },
  msgNome: {
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 2,
  },
  msgInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  msgInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  msgSendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgSendText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 180,
    marginTop: 24,
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  colorPickerBox: {
    backgroundColor: '#fff',
    width: '90%',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    position: 'absolute',
    top: StatusBar.currentHeight,
    zIndex: 1000,
    shadowRadius: 8,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  fullMapBox: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  mapBox: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    backgroundColor: 'transparent',
    alignSelf: 'center',
    marginVertical: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  falaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
}); 