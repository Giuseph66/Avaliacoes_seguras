import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import 'react-native-reanimated';

const professorItems = [
  { icon: 'school-outline', route: '/professor', label: 'Professor - Início' },
  { icon: 'create-outline', route: '/professor/criar-avaliacao', label: 'Criar Avaliação' },
  { icon: 'bar-chart-outline', route: '/professor/relatorios', label: 'Relatórios' },
  { icon: 'person-circle-outline', route: '/professor/perfil', label: 'Perfil' },
];

const alunoItems = [
  { icon: 'person-outline', route: '/aluno', label: 'Aluno - Início' },
  { icon: 'time-outline', route: '/aluno/historico', label: 'Histórico' },
  { icon: 'person-circle-outline', route: '/aluno/perfil', label: 'Perfil' },
  { icon: 'bar-chart-outline', route: '/aluno/relatorios', label: 'Relatórios' },
  { icon: 'scan-outline', route: '/aluno/entrar-sala', label: 'Entrar na Sala' },
];

const infoItems = [
  { icon: 'information-circle-outline', route: '/telas-extras/info', label: 'Sobre o Sistema' },
];

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [sidebarMode, setSidebarMode] = useState<'hidden' | 'collapsed' | 'expanded'>('collapsed');
  const pathname = usePathname();

  const currentItems = pathname.startsWith('/professor')
    ? professorItems
    : pathname.startsWith('/aluno')
    ? alunoItems
    : infoItems;

  // Não mostrar sidebar na tela de prova segura do aluno
  const hideSidebar = pathname === '/aluno/prova-segura' || pathname === '/aluno/sala-espera' || pathname === '/aluno/sala-reflexao';

  // Função para lidar com o gesto de arrastar
  const onGestureEvent = (event: any) => {
    const { translationX } = event.nativeEvent;
    if (sidebarMode === 'hidden' && translationX > 15) {
      setSidebarMode('collapsed');
      return;
    }
    if (sidebarMode === 'collapsed' && translationX > 80) {
      setSidebarMode('expanded');
      return;
    }
    if (sidebarMode === 'expanded' && translationX < -40) {
      setSidebarMode('collapsed');
      return;
    }
    if (sidebarMode === 'collapsed' && translationX < -40) {
      setSidebarMode('hidden');
    }
  };

  if (!loaded) {
    return null;
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          activeOffsetX={[-15, 15]}
          hitSlop={{ left: 0, right: 999, top: 0, bottom: 0 }}
        >
          <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Sidebar - não mostrar na tela de prova segura do aluno */}
            {sidebarMode !== 'hidden' && !hideSidebar && (
              <View style={[
                styles.sidebar,
                { backgroundColor: theme.background, borderRightColor: colorScheme === 'dark' ? '#2B2B2B' : '#E9ECEF' },
                sidebarMode === 'expanded' && styles.sidebarExpanded
              ]}>
                {/* Botão de alternância */}
                <View style={{flexDirection:'row', gap:12, alignItems:'center',justifyContent:'center',width:'100%'}}>
                <TouchableOpacity
                  style={[styles.toggleButton, { backgroundColor: colorScheme === 'dark' ? '#2B2B2B' : '#F0F4FF' }]}
                  onPress={() => {
                    setSidebarMode(
                      sidebarMode === 'collapsed'
                        ? 'expanded'
                        : sidebarMode === 'expanded'
                        ? 'hidden'
                        : 'collapsed'
                    );
                  }}
                >
                  <Ionicons name={sidebarMode === 'expanded' ? 'chevron-back' : 'menu'} size={24} color={theme.tint} />
                </TouchableOpacity>
                </View>
                {/* Itens do menu */}
                {currentItems.map((item) => (
                  <TouchableOpacity
                    key={item.route}
                    style={[
                      styles.sidebarButton,
                      sidebarMode === 'expanded' && styles.sidebarButtonExpanded
                    ]}
                    onPress={() => {
                      setSidebarMode('hidden');
                      router.push(item.route as any);
                    }}
                  >
                    <Ionicons name={item.icon as any} size={28} color={theme.tint} />
                    {sidebarMode === 'expanded' && (
                      <Text style={[styles.sidebarLabel, { color: theme.text }]}>{item.label}</Text>
                    )}
                  </TouchableOpacity>
                ))}
                {/* Botão fixo de Sair */}
                <TouchableOpacity
                  style={[
                    styles.sidebarButton,
                    styles.supportButton,
                    sidebarMode === 'expanded' && styles.sidebarButtonExpanded
                  ]}
                  onPress={() => {
                    AsyncStorage.removeItem('usuarioLogado');
                    router.push('/login' as any);
                    setSidebarMode('hidden');
                  }}
                >
                  <Ionicons name="log-out-outline" size={28} color={theme.tint} />
                  {sidebarMode === 'expanded' && (
                    <Text style={[styles.sidebarLabel, { color: theme.text }]}>Sair</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            {/* Conteúdo principal */}
            <View style={styles.content}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="cadastro" options={{ headerShown: false }} />
                <Stack.Screen name="telas-extras/recuperar-senha" options={{ headerShown: false }} />
                <Stack.Screen name="professor/index" options={{ headerShown: false }} />
                <Stack.Screen name="professor/criar-avaliacao" options={{ headerShown: false }} />
                <Stack.Screen name="professor/avaliacao-automatica" options={{ headerShown: false }} />
                <Stack.Screen name="professor/relatorios" options={{ headerShown: false }} />
                <Stack.Screen name="aluno/index" options={{ headerShown: false }} />
                <Stack.Screen name="aluno/responder-avaliacao" options={{ headerShown: false }} />
                <Stack.Screen name="aluno/historico" options={{ headerShown: false }} />
                <Stack.Screen name="professor/perfil" options={{ headerShown: false }} />
                <Stack.Screen name="aluno/perfil" options={{ headerShown: false }} />
                <Stack.Screen name="telas-extras/info" options={{ headerShown: false }} />
                <Stack.Screen name="aluno/escanear" options={{ headerShown: false }} />
                <Stack.Screen name="professor/qrcode" options={{ headerShown: false }} />
                <Stack.Screen name="aluno/sala-reflexao" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
            </View>
          </View>
        </PanGestureHandler>
      </GestureHandlerRootView>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 70,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E9ECEF',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    gap: 12,
  },
  sidebarExpanded: {
    width: 200,
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  toggleButton: {
    marginBottom: 20,
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
  },
  sidebarButton: {
    marginVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 0,
  },
  sidebarButtonExpanded: {
    width: '100%',
    justifyContent: 'flex-start',
    gap: 12,
    paddingLeft: 8,
  },
  sidebarLabel: {
    fontSize: 15,
    color: '#212529',
    fontWeight: '500',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  supportButton: {
    marginTop: 'auto',
  },
});
