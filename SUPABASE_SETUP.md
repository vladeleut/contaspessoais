# Setup do Supabase

## 1. Criar projeto

1. Vá em https://supabase.com
2. Clique em New project
3. Defina:
   - nome: ContasPessoais
   - password do banco
   - região
4. Crie o projeto

## 2. Habilitar autenticação

1. Entre em Authentication
2. Providers
3. Ative Email / Password
4. Se quiser testar sem bloquear login, deixe a confirmação de e-mail desativada temporariamente

## 3. Rodar o schema

No SQL Editor do Supabase, execute o conteúdo de `supabase/create-tables.sql`.

## 4. Popular categorias do cartão

Você pode criar as categorias do cartão diretamente no frontend ou rodar um insert no SQL Editor para os valores que você usa:

- Seguro (Azul)
- Celular
- Spotify
- YT Premium
- Netflix
- Petz
- ConnectCar
- Google One
- GHC
- Claro Casa
- Mercado
- Almoços
- Jantas
- Combustível
- Sacolão
- Frios
- Eventuais 1
- Eventuais 2
- Eventuais 3
- Parcela 1
- Parcela 2
- Adiantamentos
- Total meu
- Add Mery
- Add Mãe
- Add Pai
- Add Douglas
- Total fatura

Exemplo:

```sql
insert into public.card_categories (user_id, name)
values
  (auth.uid(), 'Seguro (Azul)'),
  (auth.uid(), 'Celular'),
  (auth.uid(), 'Spotify');
```

> Esse insert funciona melhor quando o usuário já está logado em um teste real.

## 5. Conectar o app

No arquivo `.env.example`, use:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

No app statico atual, o equivalente é o arquivo `config.js` com:

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://SEU_PROJETO.supabase.co',
  supabaseAnonKey: 'SUA_CHAVE_PUBLICA'
};
```

## 6. Publicar no GitHub Pages

1. Crie o repositório GitHub
2. Faça push do projeto
3. Vá em Settings > Pages
4. Source: GitHub Actions
5. O workflow em `.github/workflows/deploy-pages.yml` já foi criado

## 7. Próximas melhorias que eu sugiro

- login e cadastro de usuário melhorado
- filtro por mês e categoria
- criação de “novo mês” com cópia do anterior
- botão de marcar conta fixa como paga
- resumo de faturamento do cartão
- transferências para conta paralela
- vistas e gráficos de evolução
