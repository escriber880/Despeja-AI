const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

// Garante diretório de dados
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Arquivos de dados (substituição mínima de um banco real)
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MEMORIES_FILE = path.join(DATA_DIR, 'memories.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function readJsonFile(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeJsonFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Inicializa arquivos se não existirem
if (!fs.existsSync(USERS_FILE)) writeJsonFile(USERS_FILE, []);
if (!fs.existsSync(MEMORIES_FILE)) writeJsonFile(MEMORIES_FILE, {});
if (!fs.existsSync(HISTORY_FILE)) writeJsonFile(HISTORY_FILE, {});

// -------------------------------------------------------
// Helpers de resposta
// -------------------------------------------------------
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.writeHead(status);
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function getPath(req) {
  return req.url.split('?')[0];
}

// -------------------------------------------------------
// Endpoints simulados de LLM (substituir por chamada real quando houver chave)
// -------------------------------------------------------
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_ENDPOINT = process.env.LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT_PT = `Você é um extrator de intenções para o app "Despeja AI".
O usuário solta um "despejo mental" por voz ou texto em português do Brasil.
Sua tarefa: extrair AÇÕES prontas para execução em 1 toque.

Retorne SOMENTE um JSON válido, sem markdown, sem explicações.

Esquema:
{
  "actions": [
    {
      "id": "gerado automaticamente",
      "type": "whatsapp" | "calendar" | "email" | "billing" | "task" | "idea",
      "badge": "string curta para badge",
      "contact": "nome do contato se houver, senão null",
      "title": "título curto da ação",
      "timeSaved": número inteiro (minutos estimados),
      "draft": "texto do rascunho pronto (WhatsApp/e-mail/cobrança)",
      "items": ["item 1", "item 2"] (apenas se type === "task"),
      "when": "data/hora se mencionada, senão null",
      "ctaLabel": "texto do botão de execução"
    }
  ]
}

Regras:
- WhatsApp: se mencionar mandar/avisar/responder/falar com alguém via zap/whatsapp/mensagem.
- Calendar: se mencionar reunião, agenda, bloquear, marcar, dentista, médico, às [hora].
- Email: se mencionar e-mail, email, contador, proposta formal.
- Billing: se mencionar cobrar, parcela, fatura, pix, boleto, pagar, R$ .
- Task: compras, lembretes gerais, tarefas não classificadas acima.
- Idea: ideia, criar, post, vídeo, reels, curso, projeto, lançar.

Tons para WhatsApp (casual/profissional/direto): gere 3 versões no draft principal (casual) e deixe as outras implícitas.
Se não houver contato claro, contact = null.
`;

// -------------------------------------------------------
// Servidor
// -------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = getPath(req);

  // ==================== API ====================
  if (urlPath.startsWith('/api/')) {
    // Auth simples: header Authorization: Bearer <token>
    // Para MVP, token é opcional. Usamos userId via query ?userId= ou header X-User-Id.
    const userId = req.headers['x-user-id'] || (req.url.split('?')[1] || '').split('&').find(p => p.startsWith('userId='))?.split('=')[1] || 'anon';

    try {
      // ---------- MEMORY ----------
      if (urlPath === '/api/memory') {
        if (req.method === 'GET') {
          const memories = readJsonFile(MEMORIES_FILE, {});
          sendJson(res, 200, memories[userId] || { contacts: [], tone: 'casual', pixKey: '', bank: '', workStart: '09:00', workEnd: '18:00' });
          return;
        }
        if (req.method === 'POST') {
          const body = JSON.parse(await readBody(req) || '{}');
          const memories = readJsonFile(MEMORIES_FILE, {});
          memories[userId] = body;
          writeJsonFile(MEMORIES_FILE, memories);
          sendJson(res, 200, { ok: true });
          return;
        }
      }

      // ---------- HISTORY ----------
      if (urlPath === '/api/history') {
        if (req.method === 'GET') {
          const history = readJsonFile(HISTORY_FILE, {});
          sendJson(res, 200, history[userId] || []);
          return;
        }
        if (req.method === 'POST') {
          const body = JSON.parse(await readBody(req) || '{}');
          const history = readJsonFile(HISTORY_FILE, {});
          const userHist = history[userId] || [];
          userHist.unshift({ ...body, savedAt: new Date().toISOString() });
          history[userId] = userHist.slice(0, 200); // mantém apenas os últimos 200
          writeJsonFile(HISTORY_FILE, history);
          sendJson(res, 200, { ok: true, count: userHist.length });
          return;
        }
      }

      // ---------- PARSE (LLM ou fallback) ----------
      if (urlPath === '/api/parse' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const { text } = body;

        if (!text || !text.trim()) {
          sendJson(res, 400, { error: 'Texto vazio' });
          return;
        }

        let result;
        if (LLM_API_KEY) {
          try {
            // Chamada real para LLM (OpenAI-compatible). Descomente/configurar quando tiver chave.
            const llmResp = await fetch(LLM_ENDPOINT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LLM_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.3,
                messages: [
                  { role: 'system', content: SYSTEM_PROMPT_PT },
                  { role: 'user', content: text },
                ],
              }),
            });
            const llmData = await llmResp.json();
            const content = llmData.choices?.[0]?.message?.content || '{}';
            // Remove possíveis blocos de markdown
            const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            result = JSON.parse(clean);
          } catch (e) {
            console.error('LLM erro, usando fallback:', e.message);
            result = fallbackParse(text);
          }
        } else {
          result = fallbackParse(text);
        }

        // Garante IDs únicos
        if (result.actions) {
          result.actions = result.actions.map((a, i) => ({ ...a, id: a.id || `api_${Date.now()}_${i}` }));
        }

        sendJson(res, 200, result);
        return;
      }

      // ---------- Auth simulado (registro/login simples) ----------
      if (urlPath === '/api/auth/register' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const { email, password } = body;
        if (!email || !password) {
          sendJson(res, 400, { error: 'E-mail e senha obrigatórios' });
          return;
        }
        const users = readJsonFile(USERS_FILE, []);
        if (users.find(u => u.email === email)) {
          sendJson(res, 409, { error: 'Usuário já existe' });
          return;
        }
        const user = {
          id: 'u_' + crypto.randomBytes(8).toString('hex'),
          email,
          passwordHash: crypto.createHash('sha256').update(password).digest('hex'),
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        writeJsonFile(USERS_FILE, users);
        sendJson(res, 201, { token: user.id, user: { id: user.id, email: user.email } });
        return;
      }

      if (urlPath === '/api/auth/login' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const { email, password } = body;
        const users = readJsonFile(USERS_FILE, []);
        const user = users.find(u => u.email === email && u.passwordHash === crypto.createHash('sha256').update(password).digest('hex'));
        if (!user) {
          sendJson(res, 401, { error: 'Credenciais inválidas' });
          return;
        }
        sendJson(res, 200, { token: user.id, user: { id: user.id, email: user.email } });
        return;
      }

      sendJson(res, 404, { error: 'Rota da API não encontrada' });
      return;
    } catch (err) {
      console.error('API error:', err);
      sendJson(res, 500, { error: 'Erro interno do servidor' });
      return;
    }

    // Se chegou aqui sem match, cai para 404 da API
    sendJson(res, 404, { error: 'Rota da API não encontrada' });
    return;
  }

  // ==================== Arquivos estáticos (PWA + app) ====================
  let reqPath = urlPath;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback para index.html (SPA / PWA)
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Arquivo não encontrado');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(fallback);
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Erro interno do servidor');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const MIME_TYPES = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.ico': 'image/x-icon',
      '.webmanifest': 'application/manifest+json',
    };
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

// -------------------------------------------------------
// Parser fallback (regras, em Node) — usado quando não há chave de LLM
// -------------------------------------------------------
function fallbackParse(text) {
  const segments = text
    .replace(/\b(ah e|ah,|aliás|também preciso|também tenho que|e também|e depois|além disso|outro ponto)\b/gi, '|')
    .replace(/[.;!\n]+/g, '|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 3);

  const actions = [];
  const checklistItems = [];

  segments.forEach((seg, idx) => {
    const lower = seg.toLowerCase();

    // Contato simples (heurística)
    let contact = null;
    const m = seg.match(/(?:pro|pra|para o|para a|para|da|do|com o|com a|responder o|responder a|avisar o|avisar a|cobrar o|cobrar a)\s+([a-zA-ZÀ-ÿ]+)/i);
    if (m && m[1]) contact = m[1].charAt(0).toUpperCase() + m[1].slice(1);

    if (/(whats|zap|mensagem|avisar|responder|falar com|chamar)/i.test(lower)) {
      const target = contact || 'Contato';
      const casual = `Oi ${target}! Tudo bem? ${seg}.`;
      const formal = `Olá, ${target}! ${seg}.`;
      const direto = `Oi ${target}! ${seg}.`;
      actions.push({
        id: `fb_wa_${Date.now()}_${idx}`,
        type: 'whatsapp',
        badge: 'WhatsApp Pronto',
        contact: target,
        title: `Mensagem para ${target}`,
        timeSaved: 3,
        tones: { casual, profissional: formal, direto },
        currentTone: 'casual',
        draft: casual,
        ctaLabel: 'Aprovar e Enviar',
      });
    } else if (/(e-mail|email|contador|proposta formal)/i.test(lower)) {
      actions.push({
        id: `fb_em_${Date.now()}_${idx}`,
        type: 'email',
        badge: 'E-mail Rascunhado',
        contact: contact,
        title: `E-mail para ${contact || 'Destinatário'}`,
        timeSaved: 4,
        draft: `Assunto: Alinhamento rápido\n\nOlá${contact ? ', ' + contact : ''}!\n\n${seg}\n\nObrigado!`,
        ctaLabel: 'Aprovar E-mail',
      });
    } else if (/(cobrar|parcela|fatura|pix|boleto|pagar|R\$)/i.test(lower)) {
      actions.push({
        id: `fb_bi_${Date.now()}_${idx}`,
        type: 'billing',
        badge: 'Financeiro / Pix Pronto',
        contact: contact,
        title: contact ? `Cobrança ${contact}` : 'Cobrança Pendente',
        timeSaved: 4,
        draft: `💰 Valor: a confirmar\n📆 ${seg}\n📲 Mensagem de cobrança pronta.`,
        ctaLabel: 'Programar Ação Financeira',
      });
    } else if (/(reunião|agenda|bloquear|marcar|dentista|médico|às \d{1,2}h)/i.test(lower)) {
      actions.push({
        id: `fb_ca_${Date.now()}_${idx}`,
        type: 'calendar',
        badge: 'Bloco na Agenda',
        contact: contact,
        title: seg.slice(0, 60),
        timeSaved: 3,
        draft: `📅 ${seg}\n🔔 Alerta 15 min antes.`,
        ctaLabel: 'Confirmar na Agenda',
      });
    } else if (/(ideia|criar|post|vídeo|reels|curso|projeto|lançar)/i.test(lower)) {
      actions.push({
        id: `fb_id_${Date.now()}_${idx}`,
        type: 'idea',
        badge: 'Ideia + Próximo Passo',
        contact: null,
        title: seg.slice(0, 60),
        timeSaved: 4,
        draft: `💡 Ideia: "${seg}"\n• Próximo passo: estruturar rascunho inicial.`,
        ctaLabel: 'Salvar no Cofre',
      });
    } else {
      checklistItems.push(seg);
    }
  });

  if (checklistItems.length > 0) {
    actions.push({
      id: `fb_tk_${Date.now()}`,
      type: 'task',
      badge: 'Checklist Inteligente',
      contact: null,
      title: 'Tarefas Rápidas',
      timeSaved: 2,
      items: checklistItems,
      ctaLabel: 'Confirmar Checklist',
    });
  }

  return { actions };
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Despeja AI backend running at http://0.0.0.0:${PORT}`);
  console.log(`LLM_API_KEY: ${LLM_API_KEY ? 'configurada' : 'não configurada (usando fallback de regras)'}`);
});
