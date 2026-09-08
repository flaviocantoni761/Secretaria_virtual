# Secretária Virtual

Assistente pessoal via WhatsApp: anota compromissos, categoriza gastos, guarda lembretes e liga para contatos quando pedido.

## Como funciona
1. A pessoa manda mensagem de texto ou áudio no WhatsApp (número dela, conectado via Baileys).
2. `src/index.js` recebe a mensagem e manda pra API da Claude (`aiParser.js`), que classifica a intenção em JSON.
3. `intentHandler.js` grava no Postgres (compromisso, gasto, lembrete ou lembrete de ligação).
4. `src/scheduler.js` roda em paralelo (processo separado) checando a cada minuto o que está pra vencer, e:
   - manda mensagem de WhatsApp, ou
   - dispara uma ligação de verdade via Twilio Voice.

## Setup local
```bash
npm install
cp .env.example .env   # preencher as variáveis
node src/index.js      # escanear o QR code com o WhatsApp dela
node src/scheduler.js  # em outro terminal/processo
```

## Variáveis de ambiente (.env)
```
DATABASE_URL=postgres://...          # Railway fornece automaticamente
ANTHROPIC_API_KEY=sk-ant-...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

## Deploy no Railway
1. Criar novo projeto no Railway, adicionar plugin PostgreSQL (gera `DATABASE_URL` automaticamente).
2. Rodar `schema.sql` uma vez no banco (via Railway CLI ou um client Postgres qualquer).
3. Criar dois serviços a partir do mesmo repo:
   - **web**: `npm start` (roda `src/index.js` — conexão com WhatsApp)
   - **worker**: `npm run worker` (roda `src/scheduler.js` — dispara lembretes)
4. **Atenção Baileys + Railway**: a sessão do WhatsApp (`auth_info/`) fica em disco local do container. Sem volume persistente, ela se perde a cada deploy e é preciso escanear o QR de novo. Adicione um **volume persistente** no Railway apontando pra pasta `auth_info/`.
5. O QR code aparece nos logs do serviço "web" no primeiro start — é aí que ela escaneia com o WhatsApp dela.

## Cadastro de contatos
Por enquanto os contatos (pra "call_reminder") precisam ser inseridos direto no banco:
```sql
INSERT INTO contacts (user_id, name, phone_number) VALUES (1, 'João', '+5511988887777');
```
Dá pra evoluir isso depois pra ela cadastrar contatos pelo próprio WhatsApp ("salva o contato João, número tal").

## Próximos passos sugeridos
- Transcrição de áudio (Whisper API) antes de mandar pro `aiParser.js` — hoje só trata texto.
- Comando de cadastro de contato via mensagem.
- Confirmação antes de apagar/cancelar um compromisso.
- Fuso horário por usuário (já tem coluna em `users.timezone`, falta usar no parser).
