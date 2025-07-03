// Tipos para a funcionalidade de IA
interface Message {
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text?: string;
    };
  };
  transcription?: string;
  key?: {
    fromMe?: boolean;
  };
}

interface QuestaoIA {
  texto: string;
  tipo: 'objetiva' | 'discursiva';
  alternativas?: Array<{
    texto: string;
    correta: boolean;
  }>;
  respostaCorreta?: string;
}

interface RespostaIA {
  questoes: QuestaoIA[];
}

// Função para gerar questões usando IA
async function gerarQuestoesIA(
  materia: string,
  tema: string,
  nivel: 'facil' | 'medio' | 'dificil',
  quantidade: number,
  tipoQuestao: 'objetiva' | 'discursiva' | 'mista',
  instrucoes?: string,
  key_google?: string
): Promise<QuestaoIA[]> {
  try {
    if (!key_google) {
      throw new Error('Chave da API do Google não fornecida');
    }

    const prompt = `Gere ${quantidade} questões de ${materia} sobre ${tema} com nível ${nivel}.

${tipoQuestao === 'objetiva' ? 'Todas as questões devem ser objetivas com 4 alternativas e apenas uma correta.' : ''}
${tipoQuestao === 'discursiva' ? 'Todas as questões devem ser discursivas.' : ''}
${tipoQuestao === 'mista' ? 'Misture questões objetivas (com 4 alternativas) e discursivas.' : ''}

${instrucoes ? `Instruções adicionais: ${instrucoes}` : ''}

Formato de resposta (JSON):
{
  "questoes": [
    {
      "texto": "Texto da questão",
      "tipo": "objetiva|discursiva",
      "alternativas": [
        {"texto": "Alternativa A", "correta": true},
        {"texto": "Alternativa B", "correta": false},
        {"texto": "Alternativa C", "correta": false},
        {"texto": "Alternativa D", "correta": false}
      ],
      "respostaCorreta": "Resposta esperada (apenas para discursivas)"
    }
  ]
}`;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key_google}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resposta.json();
    const textoResposta = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textoResposta) {
      throw new Error('Resposta vazia da IA');
    }

    // Tentar extrair JSON da resposta
    const jsonMatch = textoResposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Formato de resposta inválido');
    }

    const respostaIA: RespostaIA = JSON.parse(jsonMatch[0]);
    return respostaIA.questoes || [];

  } catch (error) {
    console.error('Erro ao gerar questões com IA:', error);
    throw error;
  }
}

// Função para corrigir questões discursivas usando IA
interface DiscursivaCorrigir {
  id: string;
  texto: string;
  respostaCorreta: string;
  respostaAluno: string;
}

interface ResultadoCorrecao {
  id: string;
  nota: number; // 0-10
  comentario?: string;
}

async function corrigirDiscursivasIA(questoes: DiscursivaCorrigir[], key_google: string): Promise<ResultadoCorrecao[]> {
  if (!key_google) throw new Error('Chave da API do Google não fornecida');

  const prompt = `Você é um corretor de provas. Avalie cada questão discursiva atribuindo uma nota de 0 a 10, onde 0 significa totalmente incorreto e 10 totalmente correto. Considere parcialmente correto se a resposta contiver elementos corretos. Responda no formato JSON conforme exemplo.

Exemplo de formato de resposta:
{
  "resultados": [
    { "id": "q1", "nota": 8, "comentario": "Resposta boa, mas faltou citar X." },
    { "id": "q2", "nota": 10 }
  ]
}

Questões a corrigir:
${questoes.map(q=>`ID: ${q.id}\nEnunciado: ${q.texto}\nGabarito: ${q.respostaCorreta}\nResposta do aluno: ${q.respostaAluno}`).join('\n---\n')}`;

  const payload = {
    contents: [ { parts: [ { text: prompt } ] } ]
  };

  const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key_google}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  const data = await resposta.json();
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error('Resposta vazia da IA');
  const jsonMatch = texto.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Formato de resposta inválido');
  const obj = JSON.parse(jsonMatch[0]);
  return obj.resultados||[];
}

export { corrigirDiscursivasIA, gerarQuestoesIA };
export type { DiscursivaCorrigir, QuestaoIA, RespostaIA, ResultadoCorrecao };

