import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { addMinutes, setHours, setMinutes, startOfDay, endOfHour, isBefore, areIntervalsOverlapping, format } from 'date-fns';

const OPEN_HOUR = 10;
const LAST_START_HOUR = 18; // A cliente pode marcar ATÉ as 18h.
const SLOT_INTERVAL = 30; // Minutos

export type UnavailableReason = 'blocked' | 'full' | 'closed' | null;

export function useAvailability(selectedDate: Date | null, durationMinutes: number) {
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [unavailableReason, setUnavailableReason] = useState<UnavailableReason>(null);

    useEffect(() => {
        async function checkAvailability() {
            if (!selectedDate || durationMinutes <= 0) {
                setUnavailableReason(null);
                return;
            }

            // Base day of week
            const dayOfWeek = selectedDate.getDay();
            setLoading(true);
            setUnavailableReason(null);

            try {
                // 1. Definir intervalo do dia
                const startDay = startOfDay(selectedDate);
                const endDay = endOfHour(setHours(startDay, 23));

                // 2. Busca agendamentos do dia
                const { data: appointments, error: appError } = await supabase
                    .from('appointments')
                    .select('start_time, end_time')
                    .neq('status', 'cancelled')
                    .gte('start_time', startDay.toISOString())
                    .lte('end_time', endDay.toISOString());

                if (appError) throw appError;

                // 3. Busca bloqueios que afetam o dia (normais e recorrentes)
                const { data: blockages, error: blockError } = await supabase
                    .from('blocked_slots')
                    .select('start_time, end_time, day_of_week')
                    .or(`and(start_time.lte.${endDay.toISOString()},end_time.gte.${startDay.toISOString()}),day_of_week.eq.${dayOfWeek}`);

                if (blockError) {
                    console.warn('Erro ao buscar bloqueios:', blockError);
                }

                // 4. Verificar se há um bloqueio que cobre o horário de trabalho inteiro
                const workStart = setMinutes(setHours(startDay, OPEN_HOUR), 0);
                const workEnd = setMinutes(setHours(startDay, LAST_START_HOUR), 0);

                const hasFullDayBlock = blockages?.some(block => {
                    if (block.day_of_week !== null && block.day_of_week !== undefined) {
                        return block.day_of_week === dayOfWeek;
                    }
                    const blockStart = new Date(block.start_time);
                    const blockEnd = new Date(block.end_time);
                    // Bloqueio cobre todo o expediente se começa antes ou no início E termina depois ou no fim
                    return blockStart <= workStart && blockEnd >= workEnd;
                });

                if (hasFullDayBlock) {
                    setAvailableSlots([]);
                    setUnavailableReason('blocked');
                    setLoading(false);
                    return;
                }

                // 5. Gera todos os slots possíveis do dia
                const slots: string[] = [];
                let currentSlot = setMinutes(setHours(startDay, OPEN_HOUR), 0);
                const lastPossibleStart = setMinutes(setHours(startDay, LAST_START_HOUR), 1);

                let hasAnyBlockedSlot = false;
                let hasAnyOccupiedSlot = false;

                while (isBefore(currentSlot, lastPossibleStart)) {
                    const proposedStart = currentSlot;
                    const proposedEnd = addMinutes(currentSlot, durationMinutes);
                    const hour = proposedStart.getHours();

                    // Bloqueio de Almoço (12h às 13h)
                    const isLunchTime = hour === 12;

                    if (!isLunchTime) {
                        // 6. Verifica colisão com agendamentos
                        const hasCollision = appointments?.some(app => {
                            const appStart = new Date(app.start_time);
                            const appEnd = new Date(app.end_time);
                            return areIntervalsOverlapping(
                                { start: proposedStart, end: proposedEnd },
                                { start: appStart, end: appEnd }
                            );
                        });

                        // 7. Verifica colisão com bloqueios
                        const isBlocked = blockages?.some(block => {
                            const blockStart = new Date(block.start_time);
                            const blockEnd = new Date(block.end_time);
                            return areIntervalsOverlapping(
                                { start: proposedStart, end: proposedEnd },
                                { start: blockStart, end: blockEnd }
                            );
                        });

                        if (hasCollision) hasAnyOccupiedSlot = true;
                        if (isBlocked) hasAnyBlockedSlot = true;

                        const isPast = isBefore(proposedStart, new Date());

                        if (!hasCollision && !isPast && !isBlocked) {
                            slots.push(format(proposedStart, 'HH:mm'));
                        }
                    }

                    currentSlot = addMinutes(currentSlot, SLOT_INTERVAL);
                }

                setAvailableSlots(slots);

                // 8. Determinar razão da indisponibilidade
                if (slots.length === 0) {
                    if (hasFullDayBlock || (hasAnyBlockedSlot && !hasAnyOccupiedSlot)) {
                        setUnavailableReason('blocked');
                    } else {
                        setUnavailableReason('full');
                    }
                } else {
                    setUnavailableReason(null);
                }

            } catch (err) {
                console.error("Error fetching availability", err);
            } finally {
                setLoading(false);
            }
        }

        checkAvailability();
    }, [selectedDate, durationMinutes]);

    return { availableSlots, loading, unavailableReason };
}
