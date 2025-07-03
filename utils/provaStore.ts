import { Questao } from '@/types/avaliacao';
import { create } from 'zustand';

interface ProvaStore {
  titulo: string;
  descricao: string;
  questoes: Questao[];
  setTitulo: (titulo: string) => void;
  setDescricao: (descricao: string) => void;
  setQuestoes: (questoes: Questao[]) => void;
  addQuestao: (questao: Questao) => void;
  updateQuestao: (index: number, questao: Questao) => void;
  removeQuestao: (index: number) => void;
  clearProva: () => void;
}

export const useProvaStore = create<ProvaStore>((set, get) => ({
  titulo: '',
  descricao: '',
  questoes: [],
  
  setTitulo: (titulo) => set({ titulo }),
  setDescricao: (descricao) => set({ descricao }),
  setQuestoes: (questoes) => set({ questoes }),
  
  addQuestao: (questao) => set((state) => ({
    questoes: [...state.questoes, questao]
  })),
  
  updateQuestao: (index, questao) => set((state) => ({
    questoes: state.questoes.map((q, i) => i === index ? questao : q)
  })),
  
  removeQuestao: (index) => set((state) => ({
    questoes: state.questoes.filter((_, i) => i !== index)
  })),
  
  clearProva: () => set({ titulo: '', descricao: '', questoes: [] }),
})); 