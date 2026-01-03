import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { addMinutes, setHours, setMinutes, startOfDay, endOfHour, isBefore, areIntervalsOverlapping, format } from 'date-fns';

const OPEN_HOUR = 9;
const LAST_START_HOUR = 18; // A cliente pode marcar ATÉ as 18h.
const SLOT_INTERVAL = 30; // Minutos

export function useAvailability(selectedDate: Date | null, durationMinutes: number) {
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function checkAvailability() {
            if (!selectedDate || durationMinutes <= 0) return;

            // Bloqueio de Domingo (0) e Segunda (1)
            const dayOfWeek = selectedDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 1) {
                setAvailableSlots([]);
                return;
            }

            setLoading(true);
            try {
                // 1. Busca agendamentos do dia
                const startDay = startOfDay(selectedDate);
                const endDay = endOfHour(setHours(startDay, 23)); // Ajuste para pegar o dia todo

                const { data: appointments, error } = await supabase
                    .from('appointments')
                    .select('start_time, end_time')
                    .neq('status', 'cancelled')
                    .gte('start_time', startDay.toISOString())
                    .lte('end_time', endDay.toISOString());

                if (error) throw error;

                // 2. Gera todos os slots possíveis do dia
                const slots: string[] = [];
                let currentSlot = setMinutes(setHours(startDay, OPEN_HOUR), 0);
                const lastPossibleStart = setMinutes(setHours(startDay, LAST_START_HOUR), 1); // 18:01 para incluir 18:00

                while (isBefore(currentSlot, lastPossibleStart)) {

                    const proposedStart = currentSlot;
                    const proposedEnd = addMinutes(currentSlot, durationMinutes);

                    const hour = proposedStart.getHours();

                    // Bloqueio de Almoço (12h às 13h)
                    // Um slot é inválido se ele começa entre 12:00 e 12:59
                    const isLunchTime = hour === 12;

                    if (!isLunchTime) {
                        // 3. Verifica colisão
                        const hasCollision = appointments?.some(app => {
                            const appStart = new Date(app.start_time);
                            const appEnd = new Date(app.end_time);

                            return areIntervalsOverlapping(
                                { start: proposedStart, end: proposedEnd },
                                { start: appStart, end: appEnd }
                            );
                        });

                        const isPast = isBefore(proposedStart, new Date());

                        if (!hasCollision && !isPast) {
                            slots.push(format(proposedStart, 'HH:mm'));
                        }
                    }

                    // Próximo slot
                    currentSlot = addMinutes(currentSlot, SLOT_INTERVAL);
                }

                setAvailableSlots(slots);

            } catch (err) {
                console.error("Error fetching availability", err);
            } finally {
                setLoading(false);
            }
        }

        checkAvailability();
    }, [selectedDate, durationMinutes]);

    return { availableSlots, loading };
}
