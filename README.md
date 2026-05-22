Smart Inventory Dashboard 📦

O Smart Inventory Dashboard é uma solução de gestão de estoque desenhada para eliminar ineficiências operacionais como quebras de estoque e perdas financeiras. Desenvolvido para oferecer visão estratégica de negócio, o sistema transforma dados brutos em decisões inteligentes, permitindo que lojistas identifiquem margens de lucro, capital imobilizado e produtos com performance crítica em tempo real.

🚀 O Problema
Muitos pequenos negócios operam no "achismo" ou em planilhas manuais propensas a erros. Este projeto centraliza a gestão para resolver:

Falta de visibilidade: Incapacidade de prever faturamento real.

Perdas operacionais: Dificuldade em rastrear movimentações e histórico de produtos.

Margens ocultas: Falta de análise sobre quais categorias trazem lucro versus quais consomem capital (Capital Preso).

🛠️ Tecnologias
O projeto foi construído com uma arquitetura focada em performance e escalabilidade:

Frontend: React.js, Tailwind CSS (interface responsiva e limpa).

Backend: Supabase (Backend-as-a-Service, com foco em segurança RLS e tempo real).

Deploy: Vercel (CI/CD contínuo).

✨ Funcionalidades Principais
Dashboard Dinâmico: Visualização imediata de faturamento potencial, lucro previsto e alerta de itens críticos.

Gestão de Inventário: Cadastro intuitivo com cálculo automático de margens de lucro entre custo e venda.

Frente de Caixa (PDV): Interface otimizada para registro rápido de vendas com atualização em tempo real dos relatórios.

Relatórios de Performance: Análise financeira avançada, cruzando dados de custo vs. venda e identificando capital imobilizado.

🧠 Desafios Técnicos
O maior desafio deste projeto não foi apenas a interface, mas a implementação da lógica de negócio:

Garantir a integridade dos dados ao calcular margens de lucro e movimentações de estoque em tempo real.

Estruturar o banco de dados relacional para que o cálculo de "Capital Preso" e "ROI" fosse performático, evitando latência no frontend.

A separação de responsabilidades (Frontend vs. Backend) para garantir que a lógica de cálculo não ficasse exposta ou vulnerável.

📸 Preview
![Preview do Smart Inventory Dashboard](./src/assets/Inventario.png)

🛣️ Roadmap (Próximos Passos)
O projeto está em evolução para se tornar uma plataforma SaaS completa:

Autenticação: Implementação de login e perfis de acesso.

Dashboard de Usuário: Painéis personalizados por nível de acesso.

Expansão SaaS: Funcionalidades multi-tenant para múltiplos clientes.

💡 Como rodar localmente
Clone este repositório:

Bash
git clone [https://github.com/guiesculapio/sistema-gestao-estoque.git]  
Instale as dependências:

Bash
npm install
Configure o arquivo .env com suas credenciais do Supabase.

Execute o projeto:

Bash
npm run dev

Desenvolvido por Guilherme Esculapio
