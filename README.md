# Despeja AI

**Fale o caos da sua cabeça. Aprove a execução em 1 toque.**

App de IA & Produtividade que transforma despejos mentais por voz em ações prontas: WhatsApp, agenda, e-mail, cobrança Pix, checklists e ideias — tudo aprovado com um clique.

## 🚀 Funcionalidades

- **Voz → Execução Pronta**: fale ou digite seu brain dump e o app separa em cards acionáveis
- **WhatsApp**: rascunhos prontos no tom escolhido (Casual / Formal / Curto) com link direto `wa.me`
- **Agenda**: geração de arquivo `.ics` compatível com Google Calendar, Outlook e Apple Calendar
- **E-mail**: rascunho de assunto e corpo pronto para copiar ou enviar via `mailto:`
- **Cobrança / Pix**: valor, data e mensagem de cobrança engatilhada
- **Checklist**: itens prontos para marcar como concluído
- **Ideia**: conceito + próximos passos práticos
- **Aprovar Tudo**: dispare a fila inteira de uma vez
- **Memória de contatos**: cadastre contatos frequentes e o app reconhece nomes automaticamente
- **Estilo pessoal**: escolha seu tom padrão de escrita, chave Pix, banco e horário de trabalho
- **Persistência**: dados salvos no servidor (backend Node.js) com API REST
- **PWA**: instalável na tela inicial do celular (modo offline, ícone próprio)

## 🛠️ Stack do MVP

- **Backend**: Node.js (zero dependências externas) + arquivos JSON para persistência
- **Frontend**: HTML/CSS/JS puro, inline, responsivo, pt-BR
- **IA**: parser de regras embutido (fallback) ou LLM real via `/api/parse` (defina `LLM_API_KEY`)
- **PWA**: `manifest.json` + Service Worker para instalação e cache offline

## 📦 Instalação local

```bash
# Clonar o repositório
git clone https://github.com/SEU-USUARIO/despeja-ai.git
cd despeja-ai

# Instalar não é necessário (zero dependências)
node server.js

# Acessar
# http://localhost:3000
```

## 🔐 Variáveis de ambiente opcionais

```bash
export LLM_API_KEY="sua-chave-aqui"          # Para usar LLM real na extração de intenções
export LLM_ENDPOINT="https://api.openai.com/v1/chat/completions"
export PORT=3000
```

## 📱 Como usar como PWA

1. Acesse `http://localhost:3000` (ou seu domínio) pelo navegador do celular
2. No Chrome (Android): menu → **Adicionar à tela inicial**
3. No Safari (iOS): **Compartilhar → Adicionar à Tela de Início**

## 📁 Estrutura

```
despeja-ai/
├── server.js              # Backend Node.js + API REST
├── public/
│   ├── index.html         # Protótipo interativo (CSS/JS inline)
│   ├── manifest.json      # Metadados PWA
│   └── sw.js              # Service Worker (cache offline)
├── data/                  # Armazenamento JSON (não versionado)
│   ├── users.json
│   ├── memories.json
│   └── history.json
├── .gitignore
└── README.md
```

## 🗺️ Roadmap

- [x] Protótipo interativo pt-BR
- [x] Backend com API REST e persistência JSON
- [x] Memória de contatos e estilo pessoal
- [x] PWA instalável
- [ ] Integração com LLM real (Whisper + GPT-4o-mini/Claude)
- [ ] WhatsApp Business API (envio real)
- [ ] Google Calendar OAuth (escrita direta na agenda)
- [ ] Notificações push
- [ ] App mobile nativo (React Native / Expo)

## 📄 Licença

MIT
