# Pauta Fluxo

MVP local para organizar as pautas da Pati e a execução do Guilherme. A
aplicação protege uma tarefa ativa, planeja por capacidade, registra mudanças
de estimativa sem travar o trabalho e gera um relatório semanal que separa
entregas concluídas, progresso parcial e ações de gestão.

## Executar

```powershell
npm install
npm run dev
```

## Firebase

O app usa Firebase Authentication (Google ou e-mail/senha) e um documento compartilhado no Cloud Firestore. Copie `.env.example` para `.env.local` e preencha a configuração do app Web.

As regras em `firestore.rules` restringem o banco aos dois e-mails autorizados da equipe.

## Publicação

```bash
npm run deploy
```

O comando valida o build e publica a pasta `dist` no Firebase Hosting do projeto configurado em `.firebaserc`.

Abra `http://127.0.0.1:5173/`.

## Verificar

```powershell
npm test
npm run build
```

## Estado da entrega

Este é um `local-mvp`. Os dados ficam no armazenamento local do navegador. Não
há login real, sincronização entre dispositivos, envio por WhatsApp ou
notificações com o aplicativo fechado.
