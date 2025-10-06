-- CreateTable
CREATE TABLE "public"."comentarios" (
    "id" BIGSERIAL NOT NULL,
    "conteudo" TEXT NOT NULL,
    "foi_aprovado" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "autor_id" BIGINT NOT NULL,
    "prompt_id" BIGINT,
    "postagem_id" BIGINT,
    "comentario_pai_id" BIGINT,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."curtidas" (
    "id" BIGSERIAL NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" BIGINT NOT NULL,
    "prompt_id" BIGINT,
    "comentario_id" BIGINT,
    "postagem_id" BIGINT,

    CONSTRAINT "curtidas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."discussoes" (
    "id" BIGSERIAL NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "categoria" VARCHAR(255) NOT NULL,
    "esta_fixado" BOOLEAN NOT NULL DEFAULT false,
    "esta_bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "visualizacoes" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "autor_id" BIGINT NOT NULL,
    "e_aberta" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "discussoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."especialidades" (
    "id" BIGSERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "icone" VARCHAR(255),
    "cor" VARCHAR(255),

    CONSTRAINT "especialidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."postagens" (
    "id" BIGSERIAL NOT NULL,
    "conteudo" TEXT NOT NULL,
    "foi_aprovado" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "autor_id" BIGINT NOT NULL,
    "discussao_id" BIGINT NOT NULL,

    CONSTRAINT "postagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prompts" (
    "id" BIGSERIAL NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "descricao" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "categoria" VARCHAR(255) NOT NULL,
    "tags" TEXT[],
    "e_publico" BOOLEAN NOT NULL DEFAULT true,
    "foi_aprovado" BOOLEAN NOT NULL DEFAULT false,
    "e_destaque" BOOLEAN NOT NULL DEFAULT false,
    "visualizacoes" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "autor_id" BIGINT NOT NULL,
    "especialidade_id" BIGINT,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usuario_especialidades" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "especialidade_id" BIGINT NOT NULL,

    CONSTRAINT "usuario_especialidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usuarios" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "departamento" VARCHAR(255),
    "cargo" VARCHAR(255),
    "matricula" VARCHAR(255),
    "telefone" VARCHAR(255),
    "localizacao" VARCHAR(255),
    "biografia" TEXT,
    "avatar" VARCHAR(255),
    "esta_ativo" BOOLEAN NOT NULL DEFAULT true,
    "e_admin" BOOLEAN NOT NULL DEFAULT false,
    "e_moderador" BOOLEAN NOT NULL DEFAULT false,
    "data_entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_login" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comentarios_autor_id_idx" ON "public"."comentarios"("autor_id");

-- CreateIndex
CREATE INDEX "comentarios_comentario_pai_id_idx" ON "public"."comentarios"("comentario_pai_id");

-- CreateIndex
CREATE INDEX "comentarios_postagem_id_idx" ON "public"."comentarios"("postagem_id");

-- CreateIndex
CREATE INDEX "comentarios_prompt_id_idx" ON "public"."comentarios"("prompt_id");

-- CreateIndex
CREATE INDEX "curtidas_comentario_id_idx" ON "public"."curtidas"("comentario_id");

-- CreateIndex
CREATE INDEX "curtidas_postagem_id_idx" ON "public"."curtidas"("postagem_id");

-- CreateIndex
CREATE INDEX "curtidas_prompt_id_idx" ON "public"."curtidas"("prompt_id");

-- CreateIndex
CREATE INDEX "curtidas_usuario_id_idx" ON "public"."curtidas"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "curtidas_usuario_id_comentario_id_key" ON "public"."curtidas"("usuario_id", "comentario_id");

-- CreateIndex
CREATE UNIQUE INDEX "curtidas_usuario_id_postagem_id_key" ON "public"."curtidas"("usuario_id", "postagem_id");

-- CreateIndex
CREATE UNIQUE INDEX "curtidas_usuario_id_prompt_id_key" ON "public"."curtidas"("usuario_id", "prompt_id");

-- CreateIndex
CREATE INDEX "discussoes_autor_id_idx" ON "public"."discussoes"("autor_id");

-- CreateIndex
CREATE INDEX "discussoes_categoria_idx" ON "public"."discussoes"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "especialidades_nome_key" ON "public"."especialidades"("nome");

-- CreateIndex
CREATE INDEX "postagens_autor_id_idx" ON "public"."postagens"("autor_id");

-- CreateIndex
CREATE INDEX "postagens_discussao_id_idx" ON "public"."postagens"("discussao_id");

-- CreateIndex
CREATE INDEX "prompts_autor_id_idx" ON "public"."prompts"("autor_id");

-- CreateIndex
CREATE INDEX "prompts_categoria_idx" ON "public"."prompts"("categoria");

-- CreateIndex
CREATE INDEX "prompts_especialidade_id_idx" ON "public"."prompts"("especialidade_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_especialidades_usuario_id_especialidade_id_key" ON "public"."usuario_especialidades"("usuario_id", "especialidade_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "public"."usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_matricula_key" ON "public"."usuarios"("matricula");

-- AddForeignKey
ALTER TABLE "public"."comentarios" ADD CONSTRAINT "comentarios_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comentarios" ADD CONSTRAINT "comentarios_comentario_pai_id_fkey" FOREIGN KEY ("comentario_pai_id") REFERENCES "public"."comentarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."comentarios" ADD CONSTRAINT "comentarios_postagem_id_fkey" FOREIGN KEY ("postagem_id") REFERENCES "public"."postagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comentarios" ADD CONSTRAINT "comentarios_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."curtidas" ADD CONSTRAINT "curtidas_comentario_id_fkey" FOREIGN KEY ("comentario_id") REFERENCES "public"."comentarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."curtidas" ADD CONSTRAINT "curtidas_postagem_id_fkey" FOREIGN KEY ("postagem_id") REFERENCES "public"."postagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."curtidas" ADD CONSTRAINT "curtidas_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."curtidas" ADD CONSTRAINT "curtidas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discussoes" ADD CONSTRAINT "discussoes_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."postagens" ADD CONSTRAINT "postagens_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."postagens" ADD CONSTRAINT "postagens_discussao_id_fkey" FOREIGN KEY ("discussao_id") REFERENCES "public"."discussoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prompts" ADD CONSTRAINT "prompts_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prompts" ADD CONSTRAINT "prompts_especialidade_id_fkey" FOREIGN KEY ("especialidade_id") REFERENCES "public"."especialidades"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."usuario_especialidades" ADD CONSTRAINT "usuario_especialidades_especialidade_id_fkey" FOREIGN KEY ("especialidade_id") REFERENCES "public"."especialidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usuario_especialidades" ADD CONSTRAINT "usuario_especialidades_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
