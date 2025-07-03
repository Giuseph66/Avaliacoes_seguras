import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

interface InfoModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function InfoModal({ visible, title, onClose, children }: InfoModalProps) {
  const colorScheme = useColorScheme();
  const overlayColor = colorScheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)';

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: overlayColor }]} onPress={onClose}>
        <View style={styles.centeredView}>
          <ThemedView style={styles.modalView} lightColor="#fff" darkColor="#1f1f1f">
            <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
            <View style={styles.content}>{children}</View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <ThemedText style={styles.closeText}>Fechar</ThemedText>
            </Pressable>
          </ThemedView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    width: '85%',
  },
  modalView: {
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  content: {
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 