// Integração com a API v2 da Nvoip (OAuth2 client_credentials)
// Docs: https://nvoip.docs.apiary.io/  |  Painel: https://painel.nvoip.com.br/developer

const NVOIP_TOKEN_URL = 'https://api.nvoip.com.br/auth/oauth2/token';
const NVOIP_API_BASE = 'https://api.nvoip.com.br/v2';

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const response = await fetch(NVOIP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.NVOIP_CLIENT_ID,
      client_secret: process.env.NVOIP_CLIENT_SECRET
    })
  });

  if (!response.ok) {
    throw new Error(`Falha ao autenticar na Nvoip: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000; // renova 1 min antes de expirar
  return cachedToken;
}

/**
 * Liga para o número da usuária e toca uma mensagem de voz (TTS) com o lembrete.
 * @param {string} toNumber - número de destino, formato nacional (ex: 11999999999) ou E.164
 * @param {string} message - texto a ser falado
 */
async function makeReminderCall(toNumber, message) {
  const token = await getAccessToken();
  const destino = toNumber.replace(/^\+?55/, '').replace(/\D/g, ''); // normaliza pro formato nacional

  const response = await fetch(`${NVOIP_API_BASE}/call`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      numbersip: process.env.NVOIP_NUMBERSIP,
      called: destino,
      text: message,
      voice: 'pt-BR'
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Se o nome de algum campo estiver diferente do esperado pela API da Nvoip,
    // o erro retornado aqui normalmente indica qual parâmetro está incorreto.
    throw new Error(`Falha ao criar ligação na Nvoip: ${response.status} ${JSON.stringify(result)}`);
  }

  return result;
}

module.exports = { makeReminderCall };
