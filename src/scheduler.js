require('dotenv').config();
const db = require('./db');
const { sendMessage, startWhatsApp } = require('./whatsapp');
const { makeReminderCall } = require('./calls');

const CHECK_INTERVAL_MS = 60 * 1000; // checa a cada minuto

async function checkDue() {
  // Compromissos
  const appts = await db.query(
    `SELECT a.*, u.whatsapp_number FROM appointments a
     JOIN users u ON u.id = a.user_id
     WHERE a.status = 'pending' AND a.scheduled_at <= NOW()`
  );
  for (const appt of appts.rows) {
    await sendMessage(appt.whatsapp_number, `🔔 Compromisso agora: ${appt.title}`);
    await db.query('UPDATE appointments SET status = $1 WHERE id = $2', ['notified', appt.id]);
  }

  // Lembretes (whatsapp ou ligação)
  const reminders = await db.query(
    `SELECT r.*, u.whatsapp_number, c.phone_number as contact_phone, c.name as contact_name
     FROM reminders r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN contacts c ON c.id = r.contact_id
     WHERE r.status = 'pending' AND r.remind_at <= NOW()`
  );
  for (const rem of reminders.rows) {
    try {
      if (rem.action_type === 'call' && rem.contact_phone) {
        await makeReminderCall(
          `+${rem.whatsapp_number}`,
          `Lembrete: ${rem.message}, ligar para ${rem.contact_name}.`
        );
      } else {
        await sendMessage(rem.whatsapp_number, `🔔 Lembrete: ${rem.message}`);
      }
      await db.query('UPDATE reminders SET status = $1 WHERE id = $2', ['sent', rem.id]);
    } catch (err) {
      console.error('Falha ao disparar lembrete', rem.id, err);
      await db.query('UPDATE reminders SET status = $1 WHERE id = $2', ['failed', rem.id]);
    }
  }
}

async function start() {
  await startWhatsApp(async () => {}); // conecta ao WhatsApp (necessário pro sendMessage funcionar)
  setInterval(() => {
    checkDue().catch((err) => console.error('Erro no scheduler:', err));
  }, CHECK_INTERVAL_MS);
  console.log('Scheduler rodando — checando lembretes a cada minuto.');
}

start();
