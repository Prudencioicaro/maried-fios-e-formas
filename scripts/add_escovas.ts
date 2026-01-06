
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found in env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const newServices = [
    {
        name: 'Escova (P)',
        category: 'Escova',
        price: 60,
        duration_minutes: 45,
        description: 'Escova modelada para cabelos curtos'
    },
    {
        name: 'Escova (M)',
        category: 'Escova',
        price: 80,
        duration_minutes: 60,
        description: 'Escova modelada para cabelos médios'
    },
    {
        name: 'Escova (G)',
        category: 'Escova',
        price: 100,
        duration_minutes: 75,
        description: 'Escova modelada para cabelos longos'
    }
];

async function addServices() {
    console.log('Adicionando novos serviços de Escova...');
    const { data, error } = await supabase
        .from('procedures')
        .insert(newServices);

    if (error) {
        console.error('Erro ao inserir:', error);
    } else {
        console.log('Serviços inseridos com sucesso!');
    }
}

addServices();
