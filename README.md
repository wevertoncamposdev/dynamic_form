# TECH App

Aplicação Node.js + TypeScript + Express para apresentar o framework **TECH —
Technological Competency for Humans** e coletar respostas de dois formulários,
pensada para rodar no computador do professor e ser acessada pelos alunos na
mesma rede local (Wi-Fi da sala).

## Estrutura

```
tech-app/
├── src/
│   ├── server.ts          # servidor Express
│   ├── routes/api.ts      # rotas da API (perguntas + respostas)
│   └── utils/jsonStore.ts # leitura/escrita dos arquivos JSON
├── public/
│   ├── index.html          # landing page do framework TECH
│   ├── avaliacao/          # página e script da avaliação
│   ├── pesquisa/           # página e script da pesquisa
│   ├── modelo/             # página e script do modelo genérico
│   ├── css/style.css
│   └── js/                 # scripts do front-end (vanilla JS)
└── data/
  ├── avaliacao/
  │   ├── questions-avaliacao.json   # perguntas (edite aqui)
  │   └── responses-avaliacao.json   # respostas recebidas
  └── pesquisa/
    ├── questions-pesquisa.json    # perguntas (edite aqui)
    └── responses-pesquisa.json    # respostas recebidas
```

Não usa banco de dados nem bibliotecas de UI — só `express` no servidor e
HTML/CSS/JS puro no navegador, conforme pedido.

## Como rodar

1. Instale as dependências (uma vez):
   ```bash
   npm install
   ```
2. Crie o arquivo `.env` na raiz do projeto, baseado em `.env.example`, e defina
  uma senha para `PROFESSOR_PASSWORD`.
3. Compile o TypeScript:
   ```bash
   npm run build
   ```
4. Inicie o servidor:
   ```bash
   npm start
   ```
   (ou `npm run dev`, para rodar direto com ts-node sem precisar compilar antes)

Para desenvolvimento, use `npm run dev`. O servidor reinicia automaticamente ao
salvar arquivos em `src`, `public` ou nos arquivos de perguntas. Para depurar
com o debugger do VS Code/Chrome na porta `9229`, use `npm run debug`.

### Área do professor

Acesse `http://localhost:3000/professor.html` e entre com a senha definida em
`PROFESSOR_PASSWORD`. A sessão fica em um cookie HttpOnly temporário. O painel
valida a estrutura dos arquivos de perguntas e respostas, lista cada envio,
calcula os acertos da avaliação e apresenta a média da pesquisa por dimensão.

O terminal vai mostrar algo assim:

```
=== TECH App rodando ===
Local:   http://localhost:3000
Rede:    http://192.168.0.15:3000

Compartilhe o endereço 'Rede' acima com os alunos na mesma Wi-Fi/rede local.
========================
```

Compartilhe o endereço **"Rede"** com a turma — todos que estiverem na mesma
rede (Wi-Fi da sala, por exemplo) conseguem abrir esse link no celular ou
computador e acessar a landing page e os formulários.

Para trocar a porta: `PORT=8080 npm start`.

## Como funciona o armazenamento

- Cada avaliação tem sua própria pasta dentro de `data/`. As perguntas ficam em
  `data/<nome>/questions-<nome>.json` e as respostas em
  `data/<nome>/responses-<nome>.json`. Basta editar o arquivo de perguntas
  (respeitando o formato) para mudar o formulário — não precisa recompilar nada,
  pois ele é lido em tempo real a cada requisição.
- Cada envio é **adicionado** (append) ao array do arquivo de respostas da
  própria avaliação, com um `id` único, data/hora do envio, os dados de
  identificação e as respostas.
- Não há edição/exclusão de respostas pela interface — os arquivos podem ser
  abertos depois no próprio VS Code, Excel (após conversão) ou em um script de
  análise.

## Formato das perguntas

### Criar uma nova avaliação

A página `public/modelo/` monta qualquer formulário diretamente a partir do
JSON. Ela aceita os tipos `multipla_escolha`, `likert` e `aberta`.

1. Escolha um nome simples para a avaliação, usando letras minúsculas, números
   e hífen. Exemplo: `avaliacao-rapida`.
2. Crie uma pasta com esse nome dentro de `data/`:

   ```text
   data/avaliacao-rapida/
   ```

3. Crie os dois arquivos dentro da pasta:

   ```text
   data/avaliacao-rapida/questions-avaliacao-rapida.json
   data/avaliacao-rapida/responses-avaliacao-rapida.json
   ```

   O arquivo de perguntas deve começar com um objeto contendo `titulo`,
   `descricao` e `questoes`. As respostas devem começar como um array vazio:

   ```json
   {
     "titulo": "Avaliação rápida",
     "descricao": "Responda às questões abaixo.",
     "questoes": [
       {
         "id": "q1",
         "tipo": "multipla_escolha",
         "pergunta": "Qual alternativa está correta?",
         "opcoes": ["Alternativa A", "Alternativa B"],
         "resposta_correta": 1
       },
       {
         "id": "q2",
         "tipo": "aberta",
         "pergunta": "Explique sua resposta."
       }
     ]
   }
   ```

4. Cadastre a avaliação no objeto `FORMS` de `src/routes/api.ts`:

   ```ts
   "avaliacao-rapida": {
     questoes: path.join(DATA_DIR, "avaliacao-rapida", "questions-avaliacao-rapida.json"),
     respostas: path.join(DATA_DIR, "avaliacao-rapida", "responses-avaliacao-rapida.json"),
   },
   ```

5. Abra o modelo usando o mesmo nome:

   ```text
   http://localhost:3000/modelo/?form=avaliacao-rapida
   ```

Não é necessário criar outro HTML ou JavaScript. O modelo lê o JSON em cada
requisição, portanto alterações nas perguntas aparecem sem recompilar o
projeto.

### `questions-avaliacao.json` (múltipla escolha e abertas)
```json
{
  "id": "a1",
  "tipo": "multipla_escolha",
  "pergunta": "...",
  "opcoes": ["...", "...", "...", "..."],
  "resposta_correta": 1
}
```
ou
```json
{ "id": "a11", "tipo": "aberta", "pergunta": "..." }
```

### `questions-pesquisa.json` (escala likert 1–5 e abertas)
```json
{
  "id": "p1",
  "dimensao": "D1 — Cultura e Cidadania Digital",
  "tipo": "likert",
  "pergunta": "..."
}
```

## Extensões futuras (mencionadas pelo usuário)

O modelo de rotas já é genérico (`/api/questions/:form` e
`/api/respostas/:form`) — para adicionar um novo formulário no futuro (ex.
"avaliação rápida"), basta:
1. Criar `data/<novo-form>/questions-<novo-form>.json` e
  `data/<novo-form>/responses-<novo-form>.json`.
2. Adicionar a chave em `FORMS` dentro de `src/routes/api.ts`.
3. Abrir `public/modelo/?form=<novo-form>`; não é necessário
  criar outra página HTML ou outro script.