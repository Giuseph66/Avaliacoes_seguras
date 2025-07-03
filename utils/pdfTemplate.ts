import { Questao } from '@/types/avaliacao';
import * as FileSystem from 'expo-file-system';

// Função para converter URI de imagem para base64
async function imageToBase64(uri: string): Promise<string> {
  try {
    console.log('Convertendo imagem para base64:', uri);
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log('Imagem convertida com sucesso, tamanho:', base64.length);
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Erro ao converter imagem para base64:', error);
    return '';
  }
}

// Função para processar todas as imagens de uma questão
async function processarImagensQuestao(questao: Questao): Promise<Questao> {
  const questaoProcessada = { ...questao };
  
  // Processar imagem da questão
  if (questao.imagem) {
    questaoProcessada.imagem = await imageToBase64(questao.imagem);
  }
  
  // Processar imagens das alternativas
  if (questao.tipo === 'objetiva') {
    questaoProcessada.alternativas = await Promise.all(
      questao.alternativas.map(async (alt) => {
        if (alt.imagem) {
          return { ...alt, imagem: await imageToBase64(alt.imagem) };
        }
        return alt;
      })
    );
  }
  
  return questaoProcessada;
}

export async function gerarHTMLProva(titulo: string, descricao: string, questoes: Questao[]): Promise<string> {
  // Processar todas as imagens antes de gerar o HTML
  const questoesProcessadas = await Promise.all(
    questoes.map(processarImagensQuestao)
  );

  const html = `
   <!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo || 'Avaliação'}</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Times New Roman', Times, serif;
      margin: 60px;
      background: #fff;
      color: #000;
      line-height: 1.6;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      border-bottom: 1px solid #000;
      padding-bottom: 15px;
      margin-bottom: 40px;
    }

    .title {
      font-size: 22pt;
      font-weight: bold;
      margin-bottom: 6px;
    }

    .description {
      font-size: 12pt;
      color: #000;
    }

    .question {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }

    .question-type {
      font-size: 10pt;
      font-style: italic;
      color: #444;
      margin-bottom: 4px;
    }

    .question-number {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .question-text {
      font-size: 12pt;
      margin-bottom: 12px;
    }

    .question-image {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 10px 0;
      border: 1px solid #000;
    }

    .alternatives {
      margin-left: 25px;
    }

    .alternative {
      font-size: 11pt;
      margin-bottom: 8px;
    }

    .discursive-space {
      border: 1px solid #000;
      padding: 10px;
      min-height: 120px;
      background: repeating-linear-gradient(
        to bottom,
        #fff,
        #fff 23px,
        #000 24px,
        #fff 24.5px
      );
    }

    .footer {
      margin-top: 80px;
      text-align: center;
      font-size: 10pt;
      color: #000;
      border-top: 1px solid #000;
      padding-top: 12px;
    }

    @media print {
      body {
        margin: 40px;
      }

      .question {
        page-break-inside: avoid;
      }
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header">
      <div class="title">${titulo || 'Avaliação'}</div>
      ${descricao ? `<div class="description">${descricao}</div>` : ''}
    </div>

    ${questoesProcessadas.map((questao, index) => `
      <div class="question">
        <div class="question-text">
          <span class="question-number">${index + 1}. </span>
          ${questao.texto}
        </div>
      </div>

        ${questao.imagem ? `<img src="${questao.imagem}" class="question-image" alt="Imagem da questão ${index + 1}" />` : ''}

        ${questao.tipo === 'objetiva' ? `
          <div class="alternatives">
            ${questao.alternativas.map((alt, altIndex) => `
              <div class="alternative">
                ${String.fromCharCode(65 + altIndex)}) ${alt.texto}
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="discursive-space"></div>
        `}
      </div>
    `).join('')}

    <div class="footer">
      <p><strong>Total de questões:</strong> ${questoesProcessadas.length}</p>
      <p><strong>Objetivas:</strong> ${questoesProcessadas.filter(q => q.tipo === 'objetiva').length} |
         <strong>Discursivas:</strong> ${questoesProcessadas.filter(q => q.tipo === 'discursiva').length}</p>
    </div>
  </div>
</body>
</html>
  `;
  return html;
}
  