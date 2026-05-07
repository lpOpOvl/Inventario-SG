# Star Citizen — Inventário
Site de gestão de inventário para jogadores de Star Citizen.
Construído com Cloudflare Pages + D1 (base de dados SQLite serverless).

---

##  Como fazer o deploy (passo a passo)

### 1. Instalar o Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. Criar a base de dados D1
```bash
wrangler d1 create star-citizen-db
```
Copia o `database_id` que aparecer e cola no ficheiro `wrangler.toml` onde diz `SUBSTITUIR-PELO-TEU-ID`.

### 3. Aplicar o schema (estrutura das tabelas)
```bash
# Local (para testar)
wrangler d1 execute star-citizen-db --local --file=./schema.sql

# Produção (quando fizeres deploy)
wrangler d1 execute star-citizen-db --file=./schema.sql
```

### 4. Testar localmente
```bash
wrangler pages dev public --d1=DB=star-citizen-db
```
Abre http://localhost:8788

### 5. Fazer deploy
```bash
wrangler pages deploy public --project-name=star-citizen-inventory
```

### 6. Ligar a base de dados no dashboard da Cloudflare
1. Vai a https://dash.cloudflare.com
2. Workers & Pages → star-citizen-inventory
3. Settings → Bindings → Add → D1 database
4. Variable name: `DB`
5. Database: `star-citizen-db`
6. Faz redeploy

---

##  Estrutura do projeto
```
star-citizen-inventory/
├── public/
│   └── index.html          ← Frontend completo
├── functions/
│   └── api/
│       └── items.js        ← API (GET, POST, PUT, DELETE)
├── schema.sql              ← Estrutura da base de dados
├── wrangler.toml           ← Configuração Cloudflare
└── README.md
```

##  Funcionalidades
- Login por callsign (sem password — cada jogador tem o seu inventário)
- Adicionar itens com nome, categoria, quantidade, localização e notas
- Editar itens inline (clica no ✎)
- Remover itens
- Filtrar por categoria
- Pesquisar por nome, localização ou notas
- Estatísticas rápidas no topo
