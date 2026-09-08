const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Você é o parser de uma secretária virtual pessoal que recebe mensagens de WhatsApp (já transcritas de áudio quando necessário) e as classifica.

Responda SOMENTE com um JSON válido, sem markdown, sem texto adicional, no seguinte formato:

{
  "type": "appointment" | "expense" | "reminder" | "call_reminder" | "expense_summary_request" | "unknown",
  "title": string | null,
  "description": string | null,
  "datetime": string | null,       // ISO 8601, calculado a partir da data/hora atual fornecida
  "amount": number | null,          // valor em reais, para gastos
  "category": string | null,        // categoria do gasto (mercado, transporte, lazer, saúde, contas, alimentação, outros)
  "contact_name": string | null,    // nome da pessoa, para lembretes de ligação
  "period": string | null           // "hoje" | "semana" | "mes" | "ano", para pedidos de resumo
}

Regras:
- "appointment" = compromisso com hora marcada (reunião, consulta, evento).
- "expense" = relato de um gasto já realizado.
- "reminder" = lembrete genérico pra fazer algo, sem envolver ligar pra alguém.
- "call_reminder" = pedido pra ser lembrado de LIGAR para uma pessoa específica.
- "expense_summary_request" = pedido de resumo/relatório de gastos.
- Se a mensagem não se encaixar em nada, use "unknown".
- Sempre calcule "datetime" relativo à data/hora atual informada no contexto (ex: "amanhã às 15h", "sexta-feira").`;

/**
 * @param {string} message - Texto da mensagem do usuário (já transcrito se era áudio)
 * @param {string} nowISO - Data/hora atual no timezone do usuário, em ISO 8601
 * @returns {Promise<object>} objeto estruturado com a intenção classificada
 */
async function parseMessage(message, nowISO) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Data/hora atual: ${nowISO}\n\nMensagem do usuário: "${message}"`
      }
    ]
  });

  const text = response.content.find((b) => b.type === 'text')?.text || '{}';
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error('Falha ao parsear resposta da IA:', clean);
    return { type: 'unknown' };
  }
}

module.exports = { parseMessage };
