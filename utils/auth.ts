import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from './firebaseConfig';

export async function cadastrarUsuario({ nome, email, senha, role }: { nome: string, email: string, senha: string, role: 'professor' | 'aluno' }) {
  // Verifica se já existe usuário com o mesmo email
  const q = query(collection(firestore, 'usuarios'), where('email', '==', email));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error('Já existe um usuário com este e-mail.');
  }
  // Adiciona novo usuário
  await addDoc(collection(firestore, 'usuarios'), {
    nome,
    email,
    senha,
    role,
    criadoEm: new Date()
  });
}

export async function loginUsuario({ email, senha }: { email: string, senha: string }) {
  const q = query(collection(firestore, 'usuarios'), where('email', '==', email), where('senha', '==', senha));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    throw new Error('E-mail ou senha incorretos.');
  }
  // Retorna dados do usuário encontrado
  const doc = querySnapshot.docs[0];
  const usu = {
    nome: doc.data().nome,
    email: doc.data().email,
    role: doc.data().role,
    id: doc.id
  }
  await AsyncStorage.setItem('usuarioLogado', JSON.stringify(usu));
  return usu;
} 