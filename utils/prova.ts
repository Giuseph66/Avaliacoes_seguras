import { encode as btoa } from 'base-64';
import { addDoc, collection } from 'firebase/firestore';
import { firestore } from './firebaseConfig';

export async function salvarProva({ prova, professor }: { prova: any, professor: any }) {
  // Apenas codifica em base64 (sem AES)
  const dadosProva = JSON.stringify(prova);
  const provaCriptografada = btoa(dadosProva);

  await addDoc(collection(firestore, 'provas'), {
    provaCriptografada,
    professor,
    criadoEm: new Date()
  });
} 