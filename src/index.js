require('dotenv').config();
const express = require('express');
const QRCode = require('qrcode');
const { startWhatsApp, sendMessage, getLastQr } = require('./whatsapp');
const { parseMessage } = require('./aiParser');
const { handleIntent } = require('./intentHandler');

async function onMessage({ from, text }) {
  console.log(`Mensagem de ${from}: ${text}`);

  const nowISO = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
  const parsed = await parseMessage(text, nowISO);
  const reply = await handleIntent(from, parsed);

  await sendMessage(from, reply);
}

// Servidor HTTP simples só pra exibir o QR code como imagem (fica bem mais fácil de escanear do que no log em texto)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/qr', async (req, res) => {
  const qr = getLastQr();
  if (!qr) {
    return res.send('<h2>Nenhum QR code pendente. Ou já está conectado, ou o servidor acabou de iniciar — atualiza a página em alguns segundos.</h2>');
  }
  const qrImageDataUrl = await QRCode.toDataURL(qr);
  res.send(`
    <html>
      <body style="display:flex;flex-direction:column;align-items:center;font-family:sans-serif;padding:40px">
        <h2>Escaneie com o WhatsApp: Configurações → Aparelhos conectados → Conectar um aparelho</h2>
        <img src="${qrImageDataUrl}" style="width:300px;height:300px" />
        <p>Esta página atualiza sozinha a cada 5 segundos.</p>
        <script>setTimeout(() => location.reload(), 5000)</script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`Servidor do QR code rodando na porta ${PORT} — acesse /qr`));

startWhatsApp(onMessage).then(() => {
  console.log('Secretária virtual iniciada. Acesse /qr no navegador pra escanear.');
});
