const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Liga para o número da usuária e toca uma mensagem de voz com o lembrete.
 * @param {string} toNumber - formato E.164, ex: +5511999999999
 * @param {string} message - texto a ser falado (TTS)
 */
async function makeReminderCall(toNumber, message) {
  const twiml = `<Response><Say language="pt-BR">${message}</Say></Response>`;

  return client.calls.create({
    to: toNumber,
    from: process.env.TWILIO_PHONE_NUMBER,
    twiml
  });
}

module.exports = { makeReminderCall };
