# Supabase setup

## 1. Criar projeto

1. Acesse https://supabase.com
2. Crie um novo projeto
3. Defina projeto name, senha e região
4. Aguarde a criação

## 2. Habilitar autenticação

1. Vá em Authentication
2. Providers
3. Email
4. Ative Email / Password

## 3. Copiar chaves

1. Vá em Settings > API
2. Copie:
   - Project URL
   - anon public key

## 4. Rodar schema no SQL Editor

1. Abra SQL Editor
2. Cole e execute o conteúdo de `schema.sql`
3. Se quiser popular categorias, rode `seed-categories.sql` após criar um usuário de teste autenticado

## 5. Configuração do app

Crie um arquivo `.env.local` com:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 6. Conectar no front

Use o cliente do Supabase:

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

## 7. Próxima etapa

Depois de pronto, implemente:

- cadastro de entrada
- cadastro de gasto com cartão
- cadastro de conta fixa
- confirmação de conta fixa paga/agendada
- resumo do mês
- transferência de saldo para conta paralela
