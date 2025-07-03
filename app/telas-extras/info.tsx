import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScrollView, StatusBar, StyleSheet } from 'react-native';

export default function InfoScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.centerText}>Sobre a Plataforma</ThemedText>
        <ThemedText>
          Esta aplicação foi projetada para transformar a forma como avaliações discursivas são criadas,
          respondidas e corrigidas. Utilizando inteligência artificial, os professores ganham agilidade
          no processo de avaliação, enquanto os alunos têm uma experiência moderna e acessível diretamente
          pelo celular.
        </ThemedText>

        <ThemedText type="subtitle">⚙️ Funcionalidades Principais</ThemedText>
        <ThemedText>• Elaboração de provas personalizadas pelos professores.</ThemedText>
        <ThemedText>• Respostas em texto ou por áudio com transcrição automática.</ThemedText>
        <ThemedText>• Correção automatizada com notas de 0 a 10 e justificativas.</ThemedText>
        <ThemedText>• Relatórios analíticos de desempenho individual e por turma.</ThemedText>
        <ThemedText>• Acompanhamento do histórico de respostas e feedbacks.</ThemedText>

        <ThemedText type="subtitle">🧠 Tecnologias Utilizadas</ThemedText>
        <ThemedText>• React Native + Expo (aplicativo mobile)</ThemedText>
        <ThemedText>• Expo Router para navegação entre telas</ThemedText>
        <ThemedText>• Gesture Handler e Reanimated para interações fluídas</ThemedText>
        <ThemedText>• Expo Vector Icons para ícones personalizados</ThemedText>
        <ThemedText>• Integração com APIs de IA para transcrição e correção</ThemedText>

        <ThemedText type="subtitle">📞 Suporte e Contato</ThemedText>
        <ThemedText>Email: suporte@avaliacaointeligente.com</ThemedText>
        <ThemedText>Telefone: (11) 1234-5678</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: StatusBar.currentHeight,
  },
  content: {
    gap: 14,
    paddingBottom: 24,
  },
  centerText: {
    textAlign: 'center',
    marginBottom: 8,
  },
});
