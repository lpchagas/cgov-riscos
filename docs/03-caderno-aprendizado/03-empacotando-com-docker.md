# Aula 03 — Empacotando o Sistema com Docker para a CGTI

> **Caderno de Aprendizado — Projeto RADAR (`cgov-riscos`)**  
> **Objetivo:** Entender o que é um Container Docker e como funciona o arquivo `Dockerfile` do projeto.

---

## 1. O Problema: "Na minha máquina funciona!"

Antigamente, quando um programador terminava um sistema e entregava para a equipe de TI do órgão (a **CGTI**), acontecia um problema clássico: o computador do programador tinha uma versão do Node.js, mas o servidor da TI tinha outra versão diferente, e o sistema parava de funcionar.

## 2. A Solução: Container Docker

O **Docker** resolve isso criando uma "caixa lacrada" (chamada **Imagem de Container**) que já leva dentro dela:
1. Um mini-sistema operacional Linux super leve (**Alpine Linux**);
2. O servidor web **Nginx** configurado;
3. Os arquivos prontos do nosso aplicativo (`dist/`).

## 3. Como funciona o nosso `Dockerfile` em 2 Etapas (*Multi-Stage Build*)?

Abra o arquivo `Dockerfile` na raiz do projeto e repare que ele tem dois blocos `FROM`:
- **Etapa 1 (`FROM node:22-alpine AS construtor`):** é a "cozinha". Ela instala os pacotes (`npm ci`) e transforma o código Vue/TypeScript em páginas prontas (`npm run build`).
- **Etapa 2 (`FROM nginx:1.27-alpine`):** é a "vitrine". Ela pega **apenas o prato pronto** (`COPY --from=construtor /app/dist /usr/share/nginx/html`) e descarta toda a cozinha! Assim a imagem final fica rápida, leve e muito mais segura para os servidores do ICMBio.
