# PCSC-IA: Plataforma Colaborativa de Inteligência Artificial

Este projeto consiste em uma plataforma colaborativa para o uso de Inteligência Artificial na atividade policial, desenvolvida com React no frontend e Node.js no backend, utilizando PostgreSQL como banco de dados.

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Funcionalidades](#2-funcionalidades)
3. [Tecnologias Utilizadas](#3-tecnologias-utilizadas)
4. [Pré-requisitos](#4-pré-requisitos)
5. [Configuração do Banco de Dados](#5-configuração-do-banco-de-dados)
6. [Configuração e Execução do Backend](#6-configuração-e-execução-do-backend)
7. [Configuração e Execução do Frontend](#7-configuração-e-execução-do-frontend)
8. [Scripts de Inicialização e População](#8-scripts-de-inicialização-e-população)
9. [Estrutura do Projeto](#9-estrutura-do-projeto)
10. [Contribuição](#10-contribuição)
11. [Licença](#11-licença)

## 1. Visão Geral

A PCSC-IA é uma plataforma desenvolvida para facilitar a colaboração e o compartilhamento de prompts de Inteligência Artificial entre profissionais da segurança pública. O objetivo é otimizar o uso de IA em diversas atividades policiais, desde a análise de evidências até a redação de relatórios.

## 2. Funcionalidades

O projeto oferece as seguintes funcionalidades principais:

*   **Gerenciamento de Prompts:** Criação, visualização, busca e filtragem de prompts de IA.
*   **Fórum de Discussões:** Espaço para troca de ideias e discussões sobre o uso de IA.
*   **Interação Social:** Curtir prompts e discussões.
*   **Validações:** Validação de entrada de dados no frontend com feedback visual para o usuário.
*   **Interface Moderna:** Design intuitivo e responsivo, seguindo a identidade visual da PCSC (preto e dourado).

## 3. Tecnologias Utilizadas

**Frontend:**

*   React.js
*   Vite (para build)
*   Tailwind CSS (para estilização)
*   Shadcn/ui (componentes UI)
*   Lucide React (ícones)
*   Axios (para requisições HTTP)
*   React Router DOM (para roteamento)
*   Sonner (para notificações toast)

**Backend:**

*   Node.js
*   Express.js (framework web)
*   Prisma ORM (para interação com o banco de dados)
*   PostgreSQL (banco de dados)
*   Dotenv (para variáveis de ambiente)
*   CORS (para lidar com requisições de diferentes origens)

## 4. Pré-requisitos

Antes de iniciar, certifique-se de ter as seguintes ferramentas instaladas em sua máquina:

*   [Node.js](https://nodejs.org/en/) (versão 18 ou superior)
*   [pnpm](https://pnpm.io/installation) (gerenciador de pacotes, alternativamente npm ou yarn)
*   [PostgreSQL](https://www.postgresql.org/download/) (servidor de banco de dados)
*   [Git](https://git-scm.com/downloads)

## 5. Configuração do Banco de Dados

1.  **Crie um banco de dados PostgreSQL**

    Você pode criar um banco de dados usando o `psql` ou uma ferramenta gráfica como o `pgAdmin`.

    ```bash
    # Exemplo via psql
    psql -U seu_usuario_postgres
    CREATE DATABASE pcsc_ia_db;
    \q
    ```

2.  **Configure as variáveis de ambiente do Backend**

    No diretório raiz do backend (`backend`), crie um arquivo `.env` com o seguinte conteúdo, substituindo os valores pelos seus:

    ```env
    DATABASE_URL="postgresql://seu_usuario:sua_senha@localhost:5432/pcsc_ia_db?schema=public"
    PORT=3001
    ```

3.  **Execute as migrações do Prisma**

    Navegue até o diretório do backend e execute os comandos para aplicar o schema do banco de dados:

    ```bash
    cd backend
    pnpm install
    pnpm prisma migrate dev --name init
    ```

    Este comando criará as tabelas no banco de dados `pcsc_ia_db` conforme definido no `prisma/schema.prisma`.

4.  **Popule o banco de dados (opcional)**

    Para popular o banco de dados com dados iniciais (mocks), você pode usar o script `db_seed_script.sql` gerado. Execute-o via `psql`:

    ```bash
    psql -U seu_usuario -d pcsc_ia_db -f ./backend/db_scripts/db_seed_script.sql
    ```

    *Nota: O script `db_seed_script.sql` será gerado automaticamente durante a fase de desenvolvimento e estará disponível no diretório `backend/db_scripts`.* 

## 6. Configuração e Execução do Backend

1.  **Navegue até o diretório do backend:**

    ```bash
    cd backend
    ```

2.  **Instale as dependências:**

    ```bash
    pnpm install
    ```

3.  **Inicie o servidor backend:**

    ```bash
    pnpm start
    ```

    O backend estará rodando em `http://localhost:3001` (ou na porta especificada no seu `.env`).

## 7. Configuração e Execução do Frontend

1.  **Navegue até o diretório do frontend:**

    ```bash
    cd frontend
    ```

2.  **Instale as dependências:**

    ```bash
    pnpm install
    ```

3.  **Configure as variáveis de ambiente do Frontend**

    Crie um arquivo `.env` no diretório raiz do frontend (`frontend`) com o seguinte conteúdo:

    ```env
    VITE_API_BASE_URL=http://localhost:3001/api
    ```

4.  **Inicie o servidor de desenvolvimento do frontend:**

    ```bash
    pnpm run dev
    ```

    O frontend estará acessível em `http://localhost:5173` (ou na porta indicada pelo Vite).

## 8. Scripts de Inicialização e População

Dois scripts SQL foram gerados para auxiliar na configuração do banco de dados:

*   **`db_creation_scripts.sql`**: Contém os comandos SQL para criar as tabelas e definir os relacionamentos no banco de dados PostgreSQL, com base no schema do Prisma. Localizado em `backend/db_scripts/db_creation_scripts.sql`.
*   **`db_seed_script.sql`**: Contém comandos `INSERT` para popular as tabelas com dados de exemplo (mocks), facilitando o desenvolvimento e testes. Localizado em `backend/db_scripts/db_seed_script.sql`.

## 9. Estrutura do Projeto

```
. (diretório raiz do projeto)
├── backend/
│   ├── prisma/                  # Schema do Prisma e migrações
│   ├── src/                     # Código fonte do backend (controladores, rotas, serviços)
│   ├── db_scripts/              # Scripts de criação e população do banco de dados
│   ├── .env                     # Variáveis de ambiente do backend
│   ├── package.json             # Dependências e scripts do backend
│   └── ...
├── frontend/
│   ├── public/                  # Arquivos estáticos
│   ├── src/                     # Código fonte do frontend
│   │   ├── assets/              # Imagens e outros recursos
│   │   ├── components/          # Componentes reutilizáveis
│   │   │   └── ui/              # Componentes Shadcn/ui
│   │   ├── lib/                 # Utilitários e configuração da API
│   │   ├── pages/               # Páginas da aplicação
│   │   ├── App.jsx              # Componente principal da aplicação
│   │   ├── main.jsx             # Ponto de entrada do React
│   │   └── App.css              # Estilos globais
│   ├── .env                     # Variáveis de ambiente do frontend
│   ├── index.html               # Arquivo HTML principal
│   ├── package.json             # Dependências e scripts do frontend
│   └── ...
└── README.md                    # Este arquivo de documentação
```

## 10. Contribuição

Sinta-se à vontade para contribuir com o projeto. Para isso, siga os passos:

1.  Faça um fork do repositório.
2.  Crie uma nova branch (`git checkout -b feature/sua-feature`).
3.  Faça suas alterações e commit (`git commit -am 'Adiciona nova feature'`).
4.  Envie para a branch (`git push origin feature/sua-feature`).
5.  Abra um Pull Request.

## 11. Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes. (Será fornecido ao final do projeto)

