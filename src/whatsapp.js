const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys');
const qrcode = require('qrcode-terminal');

let sock = null;
let lastQr = null; // guarda o QR code mais recente pra exibir como imagem na rota /qr
const sentMessageIds = new Set(); // IDs das mensagens que a própria secretária enviou (pra não reprocessar como comando)

async function startWhatsApp(onMessage) {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  sock = makeWASocket({ auth: state });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      lastQr = qr;
      console.log('QR code atualizado. Abra /qr no navegador pra escanear como imagem.');
      qrcode.generate(qr, { small: true }); // mantém também no log, como alternativa
    }
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão fechada. Reconectar?', shouldReconnect);
      if (shouldReconnect) startWhatsApp(onMessage);
    } else if (connection === 'open') {
      lastQr = null; // já conectou, não precisa mais mostrar QR
      console.log('WhatsApp conectado.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    // Ignora o eco das mensagens que a própria secretária acabou de enviar (evita loop infinito)
    if (sentMessageIds.has(msg.key.id)) {
      sentMessageIds.delete(msg.key.id);
      return;
    }

    const ownJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    const ownLid = sock.user?.lid?.split(':')[0] + '@lid';
    const isSelfChat = msg.key.remoteJid === ownJid || msg.key.remoteJid === ownLid;

    const from = msg.key.remoteJid.replace('@s.whatsapp.net', '');
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      null;

    // Áudio: baixar e transcrever antes de comparar com a palavra-chave (ex: via Whisper API) — ainda não implementado
    if (!text) return;

    // No chat "Mensagens para você mesmo", qualquer frase vira comando.
    // Em conversas com outras pessoas, só processa se a mensagem começar com "anota"
    // (assim não sai respondendo bom-dia/oi de quem te manda mensagem).
    const startsWithAnota = /^\s*anota\b/i.test(text);
    if (!isSelfChat && !startsWithAnota) return;

    await onMessage({ from, text });
  });

  return sock;
}

async function sendMessage(to, text) {
  if (!sock) throw new Error('WhatsApp ainda não conectado.');
  const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
  const sent = await sock.sendMessage(jid, { text });
  if (sent?.key?.id) sentMessageIds.add(sent.key.id);
}

function getLastQr() {
  return lastQr;
}

module.exports = { startWhatsApp, sendMessage, getLastQr };
