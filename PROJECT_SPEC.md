# Especificação Técnica e Funcional: Sistema de Agendamento Maried Salão

## 1. Visão Geral
Sistema de agendamento semi-automático para salão de beleza, focado em extinguir barreiras de entrada para o público feminino +45 anos. O sistema prioriza clareza visual, facilidade de uso e um fluxo de gestão simplificado para a profissional.

**Objetivos Chave:**
- **Zero Fricção:** Cliente agenda sem login/senha.
- **Clareza Extrema:** UX adaptada para 45+ (fontes grandes, contraste alto).
- **Controle Total:** A confirmação do agendamento é manual (via WhatsApp/Dashboard), garantindo segurança na agenda.

---

## 2. Arquitetura Técnica

### Stack Tecnológica
- **Frontend:** React (Vite) + TailwindCSS.
- **Backend / Database:** Supabase (PostgreSQL + Realtime).
- **Deploy:** Vercel (Front) + Supabase Cloud (Back).
- **Integração:** WhatsApp API (Link `wa.me` direto).

### Estrutura de Dados (Supabase)

#### Tabela: `procedures` (Procedimentos)
Armazena todos os serviços base, variações e pacotes.
- `id`: UUID
- `category`: String (ex: "Cabelo", "Mechas", "Tratamentos") - Usado para os Cards da Home.
- `name`: String (ex: "Corte + Escova", "Botox - Cabelo Curto").
- `price`: Decimal (Valor do serviço).
- `duration_minutes`: Int (Duração que irá travar na agenda: 60, 90, 120...).
- `description`: Text (Detalhes, ex: "Incluso lavagem e finalização").
- `is_package`: Boolean (Se true, destaca como Pacote Promocional).
- `image_url`: String (Foto ilustrativa).

#### Tabela: `appointments` (Agendamentos)
A agenda centralizada.
- `id`: UUID
- `client_name`: String
- `client_phone`: String (WhatsApp)
- `start_time`: Timestamp (Data e Hora de início)
- `end_time`: Timestamp (Calculado automaticamente: start_time + procedure.duration)
- `status`: String (Enum: 'pending', 'confirmed', 'cancelled', 'manual_fit')
- `procedure_id`: FK -> procedures.id
- `created_at`: Timestamp

---

## 3. Fluxo do Usuário (Cliente)

### Passo 1: O Consolidador (Home)
**Objetivo:** Direcionar a cliente para a categoria correta rapidamente.
**Interface:**
- Cabeçalho minimalista com Logo.
- Lista de **6 Cards Macro** (Design grande, ícone à esquerda, seta à direita):
  1. **Corte & Tratamentos** (Hidratação, Nutrição, Reconstrução, Corte).
  2. **Coloração** (Raiz, Completa).
  3. **Mechas** (Luzes, Reflexos).
  4. **Botox** (Redução de volume).
  5. **Selagem** (Alisamento).
  6. **Penteados** (Festas, Escovas).
- **Rodapé:** Botão flutuante ou fixo "Dúvidas? Fale no WhatsApp".

### Passo 2: Seleção e Agendamento (Página do Procedimento)
**Objetivo:** Converter o interesse em um horário reservado.
**Interface (Scroll Vertical Único):**
1.  **Topo:** Botão "Voltar".
2.  **Vitrine:** Carrossel automático (loop) com fotos de resultados daquele procedimento (Altura ~35% da tela).
3.  **Seleção do Serviço (Checklist):**
    - Título: "Qual opção você deseja?"
    - Lista de opções com "Radio Buttons" gigantes.
    - Exemplo (Se clicou em Tratamentos):
        - `( )` Hidratação (1h) - R$ 100
        - `( )` Nutrição (1h) - R$ 130
        - `(⭐)` PACOTE: Corte + Hidra + Escova - R$ 150
    - *Regra:* Ao selecionar, o preço total é atualizado/destacado.
4.  **Agenda (Aparece após seleção):**
    - **Seletor de Dia:** Linha horizontal (SEG 12 | TER 13). Dias lotados ficam desabilitados.
    - **Seletor de Hora:** Pílulas de horário (09:00, 14:00).
    - *Lógica:* O sistema filtra apenas horários onde há "gap" suficiente para a duração do item selecionado.
5.  **Identificação:**
    - Inputs grandes: "Seu Nome" e "WhatsApp".
6.  **Ação (CTA):**
    - Botão "Agendar e Confirmar no WhatsApp".
    - Texto legal: "Pagamento no local (Dinheiro -10%, Crédito/Débito)".

### Passo 3: Confirmação (Pós-Clique)
1.  O sistema salva o agendamento como `pending` no Supabase.
2.  Redireciona para o WhatsApp da Maried com a mensagem:
    > "Olá! Sou [Nome], acabei de pré-agendar [Serviço] para dia [Data] às [Hora]. Aguardo confirmação!"

---

## 4. Fluxo da Profissional (Admin)

### Dashboard de Gestão
Apenas para a profissional logada.
**Interface:**
1.  **Resumo (Topo):**
    - Filtro: Hoje | Semana | Mês.
    - Cards KPI: **Faturamento Total** (R$), **Total Atendimentos** (#).
    - Gráfico de Rosca (Donut): Participação por Tipo de Serviço (ex: 40% Mechas, 20% Corte).
2.  **Agenda / Solicitações:**
    - Lista de agendamentos do dia.
    - Agendamentos `pending` aparecem com destaque e botões: [Confirmar] [Rejeitar].
    - Ao confirmar, o status muda para `confirmed` (bloqueio oficial).
3.  **Encaixe Manual:**
    - Botão "Adicionar Agendamento Manual".
    - Permite criar um agendamento ignorando validações de horário ocupado (sobreposição permitida para a dona).

---

## 5. Regras de Negócio e Preços

### Catálogo de Serviços (Base de Dados Inicial)

**Categoria: Corte & Tratamentos** (Duração Base: 1h)
- Corte Feminino + Escova: R$ 100
- Hidratação + Escova: R$ 100
- Nutrição + Escova: R$ 130
- Reconstrução + Escova: R$ 170
- **PACOTE 1:** Corte + Hidratação + Escova = R$ 150
- **PACOTE 2:** Cronograma (1 Rec + 1 Nutr + 2 Hidra) = R$ 400 (Obs: Lógica de agendamento múltiplo manual pós-venda).
- **PACOTE 3:** Cronograma Mini (1 Rec + 1 Nutr + 1 Hidra) = R$ 350.

**Categoria: Coloração**
- Raiz + Escova (1.5h): R$ 150 (Adicional tubo: +R$50 presencial).
- Gloss/Brancos (1.5h): R$ 150.

**Categoria: Mechas** (Duração Base: 3h)
- Raiz/Luzes (+Acidificação + Escova): A partir de R$ 350.
- Adicionais (Esfumar +50 / Reconstrução +100) -> *Tratados como upsell no local ou variação no site.*

**Categoria: Botox** (Duração Base: 2h)
- Curto (P): R$ 150
- Médio (M): R$ 200
- Longo (G): R$ 250

**Categoria: Selagem** (Duração Base: 2h)
- Curto (P): R$ 200
- Médio (M): R$ 250
- Longo (G): R$ 300

**Categoria: Penteados e Escovas** (Duração Base: 1h)
- Escova Curto: R$ 70
- Escova Médio: R$ 80
- Escova Longo: R$ 100
- Penteado Simples/Babyliss: R$ 120
- Penteado Preso: R$ 150-200 (Variável).

### Regras de Pagamento
- Crédito/Débito à vista.
- Crédito Parcelado: +10% acréscimo.
- Dinheiro: -10% desconto.
*(Essas regras aparecerão como texto informativo na tela de pagamento/agendamento).*

---

## 6. Layout & UX (+45 Anos)
Guidelines para o desenvolvimento das telas:

1.  **Tipografia e Leitura:**
    - Usar fonte **Inter** ou **Plus Jakarta Sans**.
    - Tamanho base de texto: `text-lg` (18px) ou maior.
    - Títulos: `text-2xl` ou `text-3xl`, sempre Bold.
2.  **Cores e Contraste:**
    - Fundo: `bg-slate-50` (Suave, não branco estourado).
    - Texto Principal: `text-slate-900` (Preto suave).
    - Cor de Ação (Primary): Dourado Elegante (`#D4AF37`) ou Verde Musgo (`#4A5D43`) para confirmar.
    - Cor de Erro/Atenção: Vermelho Terracota (menos agressivo).
3.  **Interações:**
    - Áreas de clique (Padding) generosas em todos os botões.
    - Feedback imediato: Ao clicar em uma data, ela muda de cor de fundo solidamente.

---

## 7. Próximos Passos (Dev Plan)
1.  Setup do Repositório (Vite + React + Tailwind).
2.  Setup do Supabase (Schema SQL).
3.  Desenv. Componentes UI (Design System).
4.  Desenv. Home (Consolidator).
5.  Desenv. Página de Procedimento & Lógica de Agenda.
6.  Desenv. Admin Dashboard.
