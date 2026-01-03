-- RODE ESTE ARQUIVO NO SQL EDITOR DO SUPABASE

-- 1. Tabela de Procedimentos
CREATE TABLE procedures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Corte', 'Coloração', 'Mechas', 'Botox', 'Selagem', 'Penteado'
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    description TEXT,
    is_package BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Agendamentos
CREATE TABLE appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'manual_fit')),
    procedure_id UUID REFERENCES procedures(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilita Realtime
alter publication supabase_realtime add table appointments;

-- 4. Dados Iniciais (Catálogo Básico)
INSERT INTO procedures (category, name, price, duration_minutes, description, is_package) VALUES
-- Corte e Tratamentos
('Corte e Tratamentos', 'Corte + Escova', 100.00, 60, 'Incluso lavagem e finalização', FALSE),
('Corte e Tratamentos', 'Hidratação + Escova', 100.00, 60, 'Tratamento de reposição de água', FALSE),
('Corte e Tratamentos', 'Nutrição + Escova', 130.00, 60, 'Reposição de lipídios e brilho', FALSE),
('Corte e Tratamentos', 'Reconstrução + Escova', 170.00, 60, 'Recuperação de fios danificados', FALSE),
('Corte e Tratamentos', 'PACOTE: Corte + Hidratação + Escova', 150.00, 90, 'Combo promocional completo', TRUE),
('Corte e Tratamentos', 'PACOTE: Cronograma Mini', 350.00, 60, '1 Rec + 1 Nutr + 1 Hidra (Valor total)', TRUE),

-- Coloração
('Coloração', 'Raiz + Escova', 150.00, 90, 'Retoque de raiz (até 3cm)', FALSE),
('Coloração', 'Gloss (Brancos) + Escova', 150.00, 90, 'Cobertura de brancos sem amônia', FALSE),

-- Mechas
('Mechas', 'Mechas / Luzes (Raiz)', 350.00, 180, 'Incluso Acidificação e Escova', FALSE),

-- Botox
('Botox', 'Botox - Curto (P)', 150.00, 120, 'Redução de volume e frizz (Cabelo até o pescoço)', FALSE),
('Botox', 'Botox - Médio (M)', 200.00, 120, 'Cabelo até o sutiã', FALSE),
('Botox', 'Botox - Longo (G)', 250.00, 120, 'Cabelo até a cintura', FALSE),

-- Selagem
('Selagem', 'Selagem - Curto (P)', 200.00, 120, 'Alisamento térmico (Cabelo até o pescoço)', FALSE),
('Selagem', 'Selagem - Médio (M)', 250.00, 120, 'Cabelo até o sutiã', FALSE),
('Selagem', 'Selagem - Longo (G)', 300.00, 120, 'Cabelo até a cintura', FALSE),

-- Penteado
('Penteado', 'Penteado Simples / Babyliss', 120.00, 60, 'Escova modelada', FALSE),
('Penteado', 'Penteado Semi-Preso', 130.00, 60, 'Ideal para festas', FALSE),
('Penteado', 'Penteado Preso', 180.00, 90, 'Coques e estruturas (Valor médio)', FALSE);

-- 5. Tabela de Bloqueios de Agenda
CREATE TABLE blocked_slots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Habilita Realtime para bloqueios
alter publication supabase_realtime add table blocked_slots;
