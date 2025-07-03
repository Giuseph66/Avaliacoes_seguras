export interface Alternativa {
  id: string;
  texto: string;
  imagem?: string; // URI da imagem
  correta: boolean;
}

export interface Questao {
  id: string;
  texto: string;
  imagem?: string; // URI da imagem
  tipo: 'objetiva' | 'discursiva';
  dificuldade: string;
  alternativas: Alternativa[];
  respostaCorreta?: string; // Para questões discursivas
}

export interface GeracaoIA {
  materia: string;
  tema: string;
  nivel: 'facil' | 'medio' | 'dificil';
  quantidade: string;
  tipoQuestao: 'objetiva' | 'discursiva' | 'mista';
  instrucoes?: string;
} 