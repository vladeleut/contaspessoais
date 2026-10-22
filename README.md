# Contas Pessoais

Aplicação financeira pessoal mobile-first, pensada para acompanhar receitas, despesas fixas e cartão de crédito com foco em uso real no navegador.

## Estrutura

- `index.html` — tela principal e autenticação
- `styles.css` — layout mobile-first
- `app.js` — regra de UI e integração inicial com Supabase
- `config.js` — configuração da URL e anon key do Supabase
- `supabase/create-tables.sql` — schema principal para o banco
- `SUPABASE_SETUP.md` — passo a passo de setup no Supabase
- `.github/workflows/deploy-pages.yml` — workflow para publicar no GitHub Pages

## Como testar localmente

1. Abra a pasta do projeto
2. Rode um servidor local:
   - `python -m http.server 8000`
3. Acesse:
   - `http://localhost:8000`

## Como publicar no GitHub Pages

1. Faça push do repo para o GitHub
2. Vá em Settings > Pages
3. Escolha GitHub Actions como source
4. O workflow já foi configurado em `.github/workflows/deploy-pages.yml`

## Próximas melhorias planejadas

- cadastro de salário 15 / 30 / bônus
- categorias do cartão com dropdown fixo
- contas fixas com status agendada/paga
- criação de novo mês com cópia do anterior
- total meu vs total fatura
- painel de saldo remanescente e conta paralela
- filtros por mês, categoria e status

## Importante

A autenticação e o banco real ficam no Supabase. O frontend está pronto para consumir o projeto real assim que a URL e a chave pública forem ajustadas em `config.js`.
