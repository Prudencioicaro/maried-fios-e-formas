import { useState, useEffect } from 'react';
import { format, isSameDay, isToday, startOfMonth, endOfMonth, eachDayOfInterval, startOfToday, isAfter, getMonth, addMonths, subMonths, startOfWeek, endOfWeek, isBefore, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DateSelectorProps {
    selectedDate: Date | null;
    onSelect: (date: Date) => void;
}

interface Blockage {
    id?: string;
    start_time: string;
    end_time: string;
    day_of_week?: number | null;
}

const OPEN_HOUR = 10;
const CLOSE_HOUR = 18;

export function DateSelector({ selectedDate, onSelect }: DateSelectorProps) {
    const today = startOfToday();
    const [activeMonth, setActiveMonth] = useState(
        selectedDate ? startOfMonth(selectedDate) : startOfMonth(today)
    );
    const [blockages, setBlockages] = useState<Blockage[]>([]);

    // Fetch blockages for the active month
    useEffect(() => {
        async function fetchBlockages() {
            const monthStart = startOfMonth(activeMonth);
            const monthEnd = endOfMonth(activeMonth);

            const { data, error } = await supabase
                .from('blocked_slots')
                .select('start_time, end_time, day_of_week')
                .or(`and(start_time.lte.${monthEnd.toISOString()},end_time.gte.${monthStart.toISOString()}),day_of_week.not.is.null`);

            if (error) {
                console.warn('Erro ao buscar bloqueios:', error);
                setBlockages([]);
            } else {
                setBlockages(data || []);
            }
        }

        fetchBlockages();
    }, [activeMonth]);

    // Check if a day is fully blocked (blockage covers entire work day)
    const isDayFullyBlocked = (date: Date): boolean => {
        const workStart = setMinutes(setHours(date, OPEN_HOUR), 0);
        const workEnd = setMinutes(setHours(date, CLOSE_HOUR), 0);

        return blockages.some(block => {
            if (block.day_of_week !== null && block.day_of_week !== undefined) {
                return block.day_of_week === date.getDay();
            }
            const blockStart = new Date(block.start_time);
            const blockEnd = new Date(block.end_time);
            // Blockage covers the full day if it starts at or before work start AND ends at or after work end
            return blockStart <= workStart && blockEnd >= workEnd;
        });
    };

    // Get days for calendar grid (includes padding days from prev/next months)
    const monthStart = startOfMonth(activeMonth);
    const monthEnd = endOfMonth(activeMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Check if a day is available (not past, not Sunday/Monday, in current month, not blocked)
    const isAvailable = (date: Date) => {
        const isCurrentMonth = getMonth(date) === getMonth(activeMonth);
        const isNotPast = isSameDay(date, today) || isAfter(date, today);
        const isNotBlocked = !isDayFullyBlocked(date);
        return isCurrentMonth && isNotPast && isNotBlocked;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newMonth = direction === 'prev' ? subMonths(activeMonth, 1) : addMonths(activeMonth, 1);
        // Don't allow navigation to past months
        if (direction === 'prev' && isBefore(newMonth, startOfMonth(today))) return;
        setActiveMonth(newMonth);
    };

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <div className="space-y-4">
            {/* Month Navigation Header */}
            <div className="flex items-center justify-between px-2">
                <button
                    onClick={() => navigateMonth('prev')}
                    disabled={isBefore(subMonths(activeMonth, 1), startOfMonth(today))}
                    className={cn(
                        "p-2 rounded-full transition-all",
                        isBefore(subMonths(activeMonth, 1), startOfMonth(today))
                            ? "text-slate-300 cursor-not-allowed"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <ChevronLeft size={24} />
                </button>

                <h3 className="text-lg font-black text-slate-800 capitalize">
                    {format(activeMonth, 'MMMM yyyy', { locale: ptBR })}
                </h3>

                <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-all"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, i) => (
                    <div
                        key={day}
                        className="text-center text-xs font-bold uppercase py-2 text-slate-500"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {allDays.map((date) => {
                    const isCurrentMonth = getMonth(date) === getMonth(activeMonth);
                    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                    const available = isAvailable(date);
                    const isPast = !isSameDay(date, today) && isBefore(date, today);
                    const isBlocked = isCurrentMonth && !isPast && isDayFullyBlocked(date);

                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => available && onSelect(date)}
                            disabled={!available}
                            className={cn(
                                "aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all",
                                // Not in current month
                                !isCurrentMonth && "opacity-0 pointer-events-none",
                                // Available and selected
                                isSelected && "bg-primary text-white shadow-lg shadow-amber-500/30 scale-105",
                                // Available but not selected
                                available && !isSelected && "bg-white border border-slate-100 text-slate-800 hover:border-primary hover:shadow-md",
                                // Past day
                                isCurrentMonth && isPast && "bg-slate-50 text-slate-300 cursor-not-allowed",
                                // Fully blocked day
                                isCurrentMonth && !isPast && isBlocked && "bg-slate-50 text-slate-300 cursor-not-allowed",
                            )}
                        >
                            <span className={cn(
                                "text-base font-black",
                                isSelected ? "text-white" : ""
                            )}>
                                {format(date, 'd')}
                            </span>
                            {isToday(date) && (
                                <span className={cn(
                                    "text-[8px] uppercase font-bold mt-0.5",
                                    isSelected ? "text-white/80" : "text-primary"
                                )}>
                                    Hoje
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-slate-400 uppercase font-bold">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-primary"></span> Selecionado
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></span> Fechado
                </span>
            </div>
        </div>
    );
}
