import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { firestore } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EntrarSala() {
  const router = useRouter();
  const theme = useTheme();
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');

  async function handleEntrar(cod?: string) {
    const code = (cod ?? codigo).trim();
    if (!code) return;
    setLoading(true);
    try {
      const salaRef = doc(firestore, 'salas', code);
      const salaSnap = await getDoc(salaRef);
      if (!salaSnap.exists()) {
        Alert.alert('Sala não encontrada');
        setLoading(false);
        return;
      }
      const userData = await AsyncStorage.getItem('usuarioLogado');
      if (!userData) {
        Alert.alert('Faça login novamente.');
        setLoading(false);
        return;
      }
      const aluno = JSON.parse(userData);
      const alunoDoc = doc(firestore, 'salas', code, 'alunos', aluno.id);
      const alunoSnap = await getDoc(alunoDoc);
      setCodigo('');
      setScannedData(null);
      if (alunoSnap.exists()) {
        const status = alunoSnap.data().status;
        if (status === 'expulso') {
          Alert.alert('Você foi expulso desta sala. Aguarde o professor liberar seu acesso.');
          setLoading(false);
          return;
        }
        if (status === 'fora_sala') {
          router.replace({ pathname: '/aluno/sala-reflexao', params: { salaId: code } } as any);
          setLoading(false);
          return;
        }
      }else{
        await setDoc(alunoDoc, { id: aluno.id, nome: aluno.nome, status: 'espera' });
      }
      router.push({ pathname: '/aluno/sala-espera', params: { salaId: code } });
    } catch (e) {
      Alert.alert('Erro ao entrar na sala.');
    } finally {
      setLoading(false);
    }
  }

  // Lógica do scanner
  function handleBarCodeScanned({ data }: { data: string }) {
    setShowScanner(false);
    setCodigo(data);
    setScannedData(data);
    setTimeout(() => handleEntrar(data), 400); // entra automaticamente
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <ThemedText type="title" style={styles.title}>Entrar em Sala</ThemedText>
      <TextInput
        placeholder="Código da sala"
        placeholderTextColor={theme.dark ? '#888' : '#999'}
        value={codigo}
        onChangeText={setCodigo}
        style={[styles.input, { color: theme.colors.text, backgroundColor: theme.dark ? '#222' : '#fff', borderColor: theme.dark ? '#444' : '#ccc' }]}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable style={[styles.button, { backgroundColor: theme.dark ? '#4a90e2' : '#0a7ea4' }]} onPress={() => handleEntrar()} disabled={loading}>
        <ThemedText style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar'}</ThemedText>
      </Pressable>
      <Pressable style={[styles.qrButton, { borderColor: theme.colors.primary }]} onPress={() => setShowScanner(true)}>
        <Ionicons name="qr-code-outline" size={22} color={theme.colors.primary} />
        <ThemedText style={[styles.qrButtonText, { color: theme.colors.primary }]}>Escanear QR Code</ThemedText>
      </Pressable>
      {/* Modal do scanner */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        {(!permission || !permission.granted) ? (
          <View style={styles.permissionContainer}>
            <Text style={{ textAlign: 'center', marginBottom: 12 }}>
              É necessário permitir acesso à câmera para escanear QR Codes.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Ionicons name="camera" size={24} color="#0a7ea4" />
              <Text style={{ marginLeft: 8, color: '#0a7ea4' }}>Permitir Câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 24 }} onPress={() => setShowScanner(false)}>
              <Text style={{ color: '#0a7ea4' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.scannerContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing={facing}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned}
            />
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.iconButton}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFacing(facing === 'back' ? 'front' : 'back')} style={styles.iconButton}>
                <Ionicons name="camera-reverse" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
            </View>
          </View>
        )}
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
    paddingTop: StatusBar.currentHeight,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 22,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
    alignSelf: 'center',
  },
  qrButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0a7ea4',
    borderRadius: 8,
    padding: 12,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconButton: {
    padding: 6,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: '70%',
    aspectRatio: 1,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
    borderLeftWidth: 3,
    borderTopWidth: 3,
  },
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderTopWidth: 0, borderBottomWidth: 3 },
  br: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 3, borderBottomWidth: 3 },
}); 