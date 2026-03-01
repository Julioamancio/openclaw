# 💡 Ideia do Dia: AI Meeting Notes for B2B Sales Teams

**Data:** 28/02/2025  
**Fonte:** Análise de tendências B2B SaaS 2025 (DuckDuckGo Research)

---

## 🎯 Problema
Equipes de vendas B2B perdem 30% do tempo em reuniões sem registro estruturado. CRMs tradicionais exigem entrada manual de dados após calls, causando:
- Esquecimento de detalhes críticos do cliente
- Pipeline impreciso
- Perda de insights de vendas

---

## 👥 Público
- SDRs (Sales Development Representatives)
- Account Executives
- Sales Managers
- RevOps Teams

---

## 💰 Monetização
**Modelo:** Freemium B2B SaaS
- **Free:** 5 reuniões/mês, integração básica
- **Pro:** $29/user/mês — transcrição + resumo + action items
- **Team:** $49/user/mês — analytics pipeline, coaching insights
- **Enterprise:** Custom — SSO, SOC2, API dedicada

---

## 🛠️ Stack Sugerida
```
Backend: Python (FastAPI) + Celery
Transcrição: Whisper API (OpenAI) ou local (faster-whisper)
LLM: Claude API ou Ollama local
Integrações: Salesforce, HubSpot, Pipedrive APIs
Frontend: React + Tailwind
Deploy: Railway/Render + Supabase
```

---

## ⏱️ MVP
**Tempo:** 3-4 semanas

**Features MVP:**
1. Upload de áudio/Zoom link → transcrição automática
2. Resumo com: decisores, orçamento, timeline (BANT)
3. Action items → email automático
4. Integração simples com CRM (webhook)

---

## 📈 Tendência
**Por que agora:**
- 78% das empresas B2B adotaram vendas híbridas (Gartner 2024)
- Ferramentas de transcrição (Otter, Fireflies) saturaram com preços altos
- Nicho específico (vendas B2B) permite diferenciação via workflows customizados
- IA conversacional está em maturidade (Whisper, GPT-4, Claude)

**Validação de mercado:**
- Otter.ai: Series B, ~$100M valuation
- Fireflies.ai: $20M+ ARR
- Gong/Chorus: CRM-centric, mas carece de ferramentas self-serve para SMB

**Diferencial:**
- Focus: SMB/mid-market B2B (não enterprise)
- Preço competitivo
- Setup em 2 minutos (onboarding sem fricção)
