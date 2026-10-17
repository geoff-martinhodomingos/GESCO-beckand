# GESCO Fase 2 — Backend inicial

Este pacote é um **esqueleto inicial de API**, não uma integração pronta com o frontend actual. Implementa a primeira base para pedidos de registo, aprovação administrativa, login e estrutura multi-instituição.

## Incluído
- API Node.js/Express com endpoint de saúde `/health`.
- Registo público de pedidos de instituição (`POST /api/institutions/requests`), sempre pendentes.
- Lista e decisão de pedidos reservadas a `super_admin`.
- Login com palavra-passe protegida por bcrypt e token JWT.
- PostgreSQL com tabelas para instituições, utilizadores e auditoria.
- Limitação de pedidos, cabeçalhos de segurança e controlo CORS.

## Limitações importantes
- Ainda não está ligado ao frontend GESCO existente.
- Ainda não implementa sincronização de alunos/notas/frequências, nem sincronização offline-first.
- Não há ainda fluxo completo para criar o director de cada escola após aprovação.
- A aprovação de licença não substitui validação comercial, termos, privacidade e testes de segurança.
- A licença Offline de pagamento único deve continuar a funcionar sem depender de chamadas online; a validação offline robusta e anti-cópia ainda não está implementada.
- O backend inicial não deve receber dados reais de alunos até concluir revisão de segurança, testes e políticas de acesso.

## Publicação prevista: Render + PostgreSQL
1. Criar uma base PostgreSQL no fornecedor escolhido.
2. Executar `db/schema.sql` nessa base de dados.
3. Publicar esta pasta como serviço Web Node no Render.
4. Configurar variáveis de ambiente com base em `.env.example`. Não publicar o ficheiro `.env` nem partilhar segredos.
5. Definir `CORS_ORIGIN` para o domínio exacto do site GESCO.
6. Testar `/health` e o fluxo de pedido de registo antes de ligar o frontend.

## Variáveis necessárias
`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`; `PORT` é normalmente fornecida pelo alojamento. `SETUP_SECRET` está reservado para o futuro fluxo seguro de criação de administradores e ainda não é utilizado.

## Endpoints iniciais
- `GET /health`
- `POST /api/institutions/requests`
- `POST /api/auth/login`
- `GET /api/institutions` (super_admin)
- `POST /api/institutions/:id/decision` (super_admin; `decision`: `approve`, `reject` ou `suspend`)

Este pacote é um ponto de partida técnico. Antes de uso público, precisa de revisão de código, testes, integração de frontend e endurecimento das regras de isolamento multi-instituição.
