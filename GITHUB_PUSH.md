# 📤 Enviar o Despeja AI para o GitHub

Este guia explica como enviar os arquivos do projeto para o repositório `https://github.com/escriber880/Despeja-AI`.

---

## 1. Gere um Personal Access Token (PAT)

O GitHub não aceita mais senha de conta para operações via HTTPS. Você precisa de um token.

1. Acesse o GitHub e faça login na sua conta (`escriber880`)
2. Clique na sua foto de perfil → **Settings**
3. No menu esquerdo, role até o final e clique em **Developer settings**
4. Clique em **Personal access tokens** → **Fine-grained tokens**
5. Clique em **Generate new token**
6. Preencha:
   - **Token name:** `despeja-ai-push`
   - **Expiration:** 90 dias (ou No expiration)
   - **Repository access:** Apenas `Despeja-AI` (ou All repositories)
   - **Permissions → Repository permissions:**
     - **Contents:** Read and write
     - **Metadata:** Read-only
7. Clique em **Generate token**
8. **Copie o token imediatamente** (ex: `github_pat_11ABC...`). Ele não será mostrado novamente.

---

## 2. Conecte o repositório local ao GitHub

Abra o terminal na pasta do projeto:

```bash
cd /home/user/despeja-app
```

Configure o remote (substitua `SEU_TOKEN` pelo token copiado no passo 1):

```bash
git remote set-url origin https://escriber880:SEU_TOKEN@github.com/escriber880/Despeja-AI.git
```

---

## 3. Envie os arquivos

```bash
git push -u origin main
```

Se tudo der certo, você verá algo como:

```
Enumerating objects: 9, done.
Counting objects: 100% (9/9), done.
Writing objects: 100% (9/9), 85.58 KiB | 8.56 MiB/s, done.
Total 9 (delta 0), reused 0 (delta 0), pack-reused 0
To https://github.com/escriber880/Despeja-AI.git
 * [new branch]      main -> main
Branch 'main' set up to track 'main' from origin.
```

---

## 4. Alternativa: usar credential helper (não cola o token na URL)

Se preferir não colocar o token na URL do remote:

```bash
cd /home/user/despeja-app
git config --global credential.helper cache
git push -u origin main
```

Quando o terminal pedir:
- **Username:** `escriber880`
- **Password:** cole seu Personal Access Token (não a senha da conta GitHub)

---

## 5. Verificar no GitHub

Acesse: **https://github.com/escriber880/Despeja-AI**

Você deverá ver todos os arquivos:
- `server.js`
- `public/index.html`
- `public/manifest.json`
- `public/sw.js`
- `README.md`
- `GITHUB_PUSH.md`
- `.gitignore`

> A pasta `data/` (usuários, memórias, histórico) foi excluída do versionamento pelo `.gitignore` para não expor dados reais.

---

## 6. Para enviar alterações futuras

Depois do primeiro push, basta:

```bash
cd /home/user/despeja-app
git add -A
git commit -m "sua mensagem aqui"
git push
```

---

## ⚠️ Segurança

- Nunca compartilhe seu Personal Access Token com ninguém
- Não commite o token no repositório
- Se suspeitar que o token vazou, revogue-o nas configurações do GitHub e gere um novo
