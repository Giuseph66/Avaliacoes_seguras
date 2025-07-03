import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@react-navigation/native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ImageSelectorProps {
  imageUri?: string;
  onImageSelected: (uri: string) => void;
  onImageRemoved: () => void;
  placeholder?: string;
}

export function ImageSelector({ 
  imageUri, 
  onImageSelected, 
  onImageRemoved, 
  placeholder = "Adicionar imagem" 
}: ImageSelectorProps) {
  const theme = useTheme();

  async function requestPermissions() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de permissão para acessar sua galeria de fotos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }

  async function pickImage() {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  }

  function handleRemoveImage() {
    Alert.alert(
      'Remover imagem',
      'Tem certeza que deseja remover esta imagem?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: onImageRemoved }
      ]
    );
  }

  if (imageUri) {
    return (
      <ThemedView style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        <Pressable style={styles.removeButton} onPress={handleRemoveImage}>
          <Ionicons name="close-circle" size={24} color="#d32f2f" />
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <Pressable 
      style={[
        styles.addImageButton,
        { 
          borderColor: theme.dark ? '#444' : '#ddd',
          backgroundColor: theme.dark ? '#2a2a2a' : '#f8f9fa'
        }
      ]} 
      onPress={pickImage}
    >
      <Ionicons 
        name="image-outline" 
        size={32} 
        color={theme.dark ? '#4a90e2' : '#0a7ea4'} 
      />
      <ThemedText style={[
        styles.addImageText,
        { color: theme.dark ? '#4a90e2' : '#0a7ea4' }
      ]}>
        {placeholder}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    marginVertical: 8,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  addImageButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  addImageText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
  },
}); 