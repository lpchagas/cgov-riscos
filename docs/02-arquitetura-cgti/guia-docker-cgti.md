# Dossiê de Implantação em Container Docker — Avaliação da CGTI/ICMBio

> **Destinatário:** Coordenação-Geral de Tecnologia da Informação (CGTI/DIPLAN/ICMBio)  
> **Unidade Proponente:** Coordenação de Governança e Gestão de Riscos (CGOV/CGGE/DIPLAN)  
> **Sistema:** RADAR — Rede de Avaliação, Diagnóstico e Ação em Riscos (`cgov-riscos`)

---

## 1. Resumo Arquitetural para a CGTI

O protótipo funcional do **Sistema Web RADAR** foi desenvolvido seguindo os padrões modernos de engenharia de software recomendados para o Governo Federal:

| Camada | Tecnologia Adotada | Benefício para a Infraestrutura da CGTI |
|---|---|---|
| **Identidade Visual** | `@govbr-ds/core` (v3.7) | 100% aderente ao Padrão Digital de Governo Federal (acessibilidade e responsividade). |
| **Frontend (SPA)** | Vue.js 3 + TypeScript + Vite | Compilação estática (`dist/`) leve (~150 KB comprimido), sem exigência de runtime Node.js em produção. |
| **Banco de Dados** | PostgreSQL 15+ (Supabase / Nativo) | Scripts SQL puros (`supabase/migrations/`) compatíveis com qualquer instância PostgreSQL on-premises da CGTI. |
| **Containerização** | Docker Multi-Stage (`nginx:1.27-alpine`) | Imagem final imutável, sem ferramentas de compilação expostas e pronta para Rancher/Kubernetes/Docker Swarm. |

---

## 2. Comandos para Homologação em Ambiente CGTI

```bash
# Construir a imagem de produção
docker build -t icmbio/cgov-radar:1.0.0 .

# Executar o container na porta 8080
docker run -d --name cgov-radar -p 8080:80 icmbio/cgov-radar:1.0.0
```
