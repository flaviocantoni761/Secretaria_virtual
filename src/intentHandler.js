const db = require('./db');
const { sendMessage } = require('./whatsapp');

async function getOrCreateUser(whatsappNumber) {
  const existing = await db.query('SELECT * FROM users WHERE whatsapp_number = $1', [whatsappNumber]);
  if (existing.rows[0]) return existing.rows[0];

  const created = await db.query(
    'INSERT INTO users (whatsapp_number) VALUES ($1) RETURNING *',
    [whatsappNumber]
  );
  return created.rows[0];
}

async function handleIntent(fromNumber, parsed) {
  const user = await getOrCreateUser(fromNumber);

  switch (parsed.type) {
    case 'appointment': {
      await db.query(
        'INSERT INTO appointments (user_id, title, description, scheduled_at) VALUES ($1,$2,$3,$4)',
        [user.id, parsed.title, parsed.description, parsed.datetime]
      );
      return `Compromisso anotado: "${parsed.title}" em ${parsed.datetime}.`;
    }

    case 'expense': {
      await db.query(
        'INSERT INTO expenses (user_id, description, amount, category) VALUES ($1,$2,$3,$4)',
        [user.id, parsed.title || parsed.description, parsed.amount, parsed.category || 'outros']
      );
      return `Gasto de R$${parsed.amount} anotado na categoria "${parsed.category || 'outros'}".`;
    }

    case 'reminder': {
      await db.query(
        'INSERT INTO reminders (user_id, message, remind_at, action_type) VALUES ($1,$2,$3,$4)',
        [user.id, parsed.title || parsed.description, parsed.datetime, 'whatsapp']
      );
      return `Lembrete marcado para ${parsed.datetime}.`;
    }

    case 'call_reminder': {
      const contactRes = await db.query(
        'SELECT * FROM contacts WHERE user_id = $1 AND name ILIKE $2 LIMIT 1',
        [user.id, `%${parsed.contact_name}%`]
      );
      const contact = contactRes.rows[0];
      if (!contact) {
        return `Não encontrei "${parsed.contact_name}" nos seus contatos. Quer me passar o número dele(a)?`;
      }
      await db.query(
        'INSERT INTO reminders (user_id, contact_id, message, remind_at, action_type) VALUES ($1,$2,$3,$4,$5)',
        [user.id, contact.id, parsed.description || `Ligar para ${contact.name}`, parsed.datetime, 'call']
      );
      return `Combinado — vou te lembrar de ligar para ${contact.name} em ${parsed.datetime}.`;
    }

    case 'expense_summary_request': {
      const summary = await db.query(
        `SELECT category, SUM(amount) as total FROM expenses
         WHERE user_id = $1 AND spent_at >= date_trunc($2, NOW())
         GROUP BY category ORDER BY total DESC`,
        [user.id, parsed.period === 'ano' ? 'year' : parsed.period === 'semana' ? 'week' : 'month']
      );
      if (summary.rows.length === 0) return 'Não encontrei gastos registrados nesse período.';
      const lines = summary.rows.map((r) => `- ${r.category}: R$${Number(r.total).toFixed(2)}`);
      return `Resumo de gastos:\n${lines.join('\n')}`;
    }

    default:
      return 'Não entendi se isso é um compromisso, gasto ou lembrete. Pode reformular?';
  }
}

module.exports = { handleIntent, getOrCreateUser };
