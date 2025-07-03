import { router, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { loginUsuario } from '@/utils/auth';
import { firestore } from '@/utils/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { collection, getDocs } from 'firebase/firestore';


export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [logoPressCount, setLogoPressCount] = useState(0);
  const [devMessage, setDevMessage] = useState<string | null>(null);
  const [devReady, setDevReady] = useState(false); // true após 3 cliques
  const theme = useTheme();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useState(new Animated.Value(0))[0];
  const [backgroundColor, setBackgroundColor] = useState('#0a7ea4');

  async function handleLogin() {
    setLoading(true);
    try {
      // Easter egg: 4º clique, campos vazios
      if (logoPressCount === 4 && devReady) {
        if (!email && !password) {
          setShowDeviceModal(true);
          setDevMessage(null);
        } else {
          setDevMessage('Desenvolvedor fraco, tentativa falha');
        }
        setDevReady(false);
        setLogoPressCount(0);
        setLoading(false);
        return;
      }
      // Normal login
      const user = await loginUsuario({ email, senha: password });
      if (user.role === 'professor') {
        router.push('/professor');
      } else {
        router.push('/aluno');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
    }
    const checkVersion = async () => {
      const configSnap = await getDocs(collection(firestore, 'config'));
      let data = null;      
        data = configSnap.docs[0].data(); 
        console.log(data);
        console.log('Versão do app:', data?.version);
        console.log('Versão do app no dispositivo:', Constants.expoConfig?.version);
        if (data?.version !== Constants.expoConfig?.version) {
          Alert.alert('Atualização', 'Uma nova versão do app está disponível. Por favor, atualize para continuar usando.');
          router.replace('/telas-extras/atualizar-app');
        }
      }  
    checkVersion();
  useEffect(() => {
    console.log('login');
    AsyncStorage.getItem('usuarioLogado').then(data => {
      if (data) {
        const usuario = JSON.parse(data);
        console.log(usuario);
        if (usuario.role === 'professor') {
          router.push('/professor');
        } else {
          router.push('/aluno');
        }
      }
    });
    console.log('login2');
    // Busca informações do dispositivo
    (async () => {
      const isRooted = await Device.isRootedExperimentalAsync();
      const info = {
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        designName: Device.designName,
        productName: Device.productName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        osBuildId: Device.osBuildId,
        osInternalBuildId: Device.osInternalBuildId,
        osBuildFingerprint: Device.osBuildFingerprint,
        platformApiLevel: Device.platformApiLevel,
        deviceName: Device.deviceName,
        deviceYearClass: Device.deviceYearClass,
        totalMemory: Device.totalMemory,
        supportedCpuArchitectures: Device.supportedCpuArchitectures,
        isDevice: Device.isDevice,
        deviceType: Device.deviceType,
        modelId: Device.modelId,
        isRootedExperimental: isRooted,
        appVersion: Constants.expoConfig?.version || 'N/A',
      };
      setDeviceInfo(info);
    })();
  }, []);

  // Função para lidar com o easter egg do logo
  function handleLogoPress() {
    setLogoPressCount((prev) => {
      if (prev === 2) {
        setToastMessage('Modo de desenvolvedor quase ativo...');
        setBackgroundColor('rgba(10, 126, 164, 0.35)')
        setDevReady(true);
        showToast();
        return prev + 1;
      }
      if (prev >= 4) {
        setToastMessage('Desenvolvedor fraco, tentativa falha');
        setBackgroundColor('rgba(255, 59, 59, 0.35)')
        setDevReady(false);
        setLogoPressCount(0);
        return prev + 1;
      }
      setToastMessage(null);
      return prev + 1;
    });
  }

  function showToast() {
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToastMessage(null));
      }, 2200);
    });
  }

  function closeModals() {
    setShowDeviceModal(false);
    setDevMessage(null);
    setDevReady(false);
  }

  return (
    <ThemedView style={styles.container}>
      <Pressable onPress={handleLogoPress} style={styles.logoContainer}>
        <Image source={require('@/assets/icons/logo.png')} style={[styles.logo, { tintColor: '#0a7ea4' }]} />
      </Pressable>
      <ThemedText type="title" style={styles.title}>Neurelix-Avaliação</ThemedText>
      <ThemedText type="title" style={styles.subtitle}>Acessar Plataforma</ThemedText>
      <TextInput
        placeholder="E-mail"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { backgroundColor: 'transparent' , color: theme.colors.text}]}
      />
      <TextInput
        placeholder="Senha"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={[styles.input, { backgroundColor: 'transparent' , color: theme.colors.text}]}
      />

      <Pressable style={styles.loginButton} onPress={() => handleLogin()} disabled={loading}>
        <ThemedText style={{ color: '#fff', fontWeight: '600' }}>{loading ? 'Entrando...' : 'Entrar'}</ThemedText>
      </Pressable>

      <TouchableOpacity onPress={() => router.push('/telas-extras/recuperar-senha')}>
        <ThemedText type="link">Esqueceu sua senha?</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/cadastro')} style={{ marginTop: 16 }}>
        <ThemedText type="link">Não possui conta? Cadastre-se</ThemedText>
      </TouchableOpacity>

      {/* Toast de aviso do easter egg */}
      {toastMessage && (
        <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }] }>
          <ThemedText style={[styles.toastText, { backgroundColor: backgroundColor }]}>{toastMessage}</ThemedText>
        </Animated.View>
      )}

      {/* Easter egg: Modal com informações do dispositivo */}
      <Modal visible={showDeviceModal} animationType="slide" transparent >
        <Pressable style={styles.modalOverlay} onPress={closeModals}> 
          <View style={[styles.deviceModal, { backgroundColor: theme.dark ? '#222' : '#fff' }]}> 
            <ThemedText style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 8, color: theme.colors.text, textAlign: 'center' }}>
              Easter Egg
            </ThemedText>
            <ThemedText style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 8, color: theme.colors.text, textAlign: 'center' }}>
              Informações do Dispositivo
            </ThemedText>
            <ScrollView style={{ maxHeight: '90%', marginBottom: 12 }}>
              {deviceInfo && Object.entries(deviceInfo).map(([key, value]) => (
                <ThemedText key={key} style={{ fontSize: 13, color: theme.colors.text }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>{key}:</ThemedText> {key === 'isRootedExperimental' ? (value ? 'Rooted' : 'Não Rooted') : String(value)}
                </ThemedText>
              ))}
            </ScrollView>
            <ThemedText style={{ color: theme.dark ? '#ff9800' : '#e65100', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
              Acredite ou não, esses são os dados que todos os apps usam e você nem sabe...
            </ThemedText>
            <Pressable style={styles.closeModalButton} onPress={closeModals}>
              <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Fechar</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Modal para mensagens de falha do easter egg */}
      <Modal visible={!!devMessage} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={closeModals}>
          <View style={[styles.deviceModal, { backgroundColor: theme.dark ? '#222' : '#fff', alignItems: 'center' }]}> 
            <ThemedText style={{ color: theme.colors.text, fontSize: 16, textAlign: 'center', marginBottom: 12 }}>
              {devMessage}
            </ThemedText>
            <Pressable style={styles.closeModalButton} onPress={closeModals}>
              <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Fechar</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  logoContainer: {
    width: '50%',
    height: '20%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  logo: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0a7ea4',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#0a7ea4',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  buttonText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  deviceModal: {
    width: '90%',
    alignSelf: 'center',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    alignItems: 'center',
    zIndex: 100,
  },
  toastText: {
    backgroundColor: '#222',
    color: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
}); 