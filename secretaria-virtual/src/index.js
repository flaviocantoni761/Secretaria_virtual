require('dotenv').config();
const { startWhatsApp, sendMessage } = require('./whatsapp');
const { parseMessage } = require('./aiParser');
const { handleIntent } = require('./intentHandler');

async function onMessage({ from, text }) {
  console.log(`Mensagem de ${from}: ${text}`);

  const nowISO = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
  const parsed = await parseMessage(text, nowISO);
  const reply = await handleIntent(from, parsed);

  await sendMessage(from, reply);
}

startWhatsApp(onMessage).then(() => {
  console.log('Secretária virtual iniciada. Escaneie o QR code com o WhatsApp da usuária.');
});
