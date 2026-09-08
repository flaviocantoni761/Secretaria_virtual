const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

let sock = null;

async function startWhatsApp(onMessage) {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  sock = makeWASocket({ auth: state });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('Escaneie o QR code abaixo com o WhatsApp da usuária:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão fechada. Reconectar?', shouldReconnect);
      if (shouldReconnect) startWhatsApp(onMessage);
    } else if (connection === 'open') {
      console.log('WhatsApp conectado.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid.replace('@s.whatsapp.net', '');
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      null;

    // Áudio: baixar e transcrever antes de chamar onMessage (ex: via Whisper API)
    if (!text) return;

    await onMessage({ from, text });
  });

  return sock;
}

async function sendMessage(to, text) {
  if (!sock) throw new Error('WhatsApp ainda não conectado.');
  const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text });
}

module.exports = { startWhatsApp, sendMessage };
