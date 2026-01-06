import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Procedure } from '../types/database';

export function useProcedures(category_raw: string) {
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [loading, setLoading] = useState(true);

    // Decodifica a URL (ex: "Corte%20e" -> "Corte e")
    const category = decodeURIComponent(category_raw);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                // Busca procedimentos da categoria selecionada
                const { data, error } = await supabase
                    .from('procedures')
                    .select('*')
                    .ilike('category', category)
                    .order('price', { ascending: true });

                if (error) throw error;
                setProcedures(data || []);
            } catch (err) {
                console.error('Error loading procedures:', err);
            } finally {
                setLoading(false);
            }
        }

        if (category) {
            load();
        } else {
            setLoading(false);
        }
    }, [category]);

    return { procedures, loading, categoryName: category };
}
