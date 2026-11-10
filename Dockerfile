# ==============================================================================
# DOCKERFILE OFICIAL — SISTEMA WEB RADAR (`cgov-riscos`) — ICMBio
# ==============================================================================
#
# EXPLICAÇÃO DIDÁTICA (PARA INICIANTES E PARA AVALIAÇÃO DA CGTI/ICMBio):
# O que é um Dockerfile?
# Pense nele como uma "receita de bolo automatizada" que empacota o nosso
# aplicativo dentro de uma caixa lacrada chamada Container.
#
# Usamos aqui uma técnica profissional chamada "Multi-Stage Build" (Construção
# em Duas Etapas):
# - Na ETAPA 1 (`construtor`), usamos uma imagem com Node.js apenas para
#   transformar o código TypeScript/Vue em arquivos HTML, CSS e JS otimizados;
# - Na ETAPA 2 (`servidor-producao`), jogamos fora todas as ferramentas pesadas
#   de desenvolvimento e copiamos apenas a pasta final (`dist/`) para dentro do
#   servidor web Nginx Alpine (que pesa menos de 50 MB!).
# ==============================================================================

# ------------------------------------------------------------------------------
# ETAPA 1: CONSTRUÇÃO DA APLICAÇÃO (Ambiente Node.js 22 Alpine)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS construtor

# Define a pasta de trabalho dentro do container temporário de construção:
WORKDIR /app

# Copia primeiro apenas a lista de dependências para aproveitar o cache do Docker:
COPY package.json package-lock.json ./

# Instala exatamente as versões travadas das dependências:
RUN npm ci

# Copia todo o restante do código-fonte do projeto RADAR:
COPY . .

# Compila o TypeScript e gera o pacote de produção na pasta /app/dist:
RUN npm run build

# ------------------------------------------------------------------------------
# ETAPA 2: SERVIDOR WEB LEVE DE PRODUÇÃO (Nginx 1.27 Alpine)
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS servidor-producao

# Copia a configuração customizada do Nginx para Single-Page Application (Vue Router):
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia apenas os arquivos estáticos prontos da Etapa 1 para a pasta pública do Nginx:
COPY --from=construtor /app/dist /usr/share/nginx/html

# Documenta que o container escuta na porta HTTP 80:
EXPOSE 80

# Comando que mantém o servidor Nginx rodando em primeiro plano:
CMD ["nginx", "-g", "daemon off;"]
