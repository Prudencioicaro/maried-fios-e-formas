import { useRef, useState } from 'react';
import { format, isSameDay, isToday, startOfMonth, endOfMonth, eachDayOfInterval, startOfToday, isAfter, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface DateSelectorProps {
    selectedDate: Date | null;
    onSelect: (date: Date) => void;
}

export function DateSelector({ selectedDate, onSelect }: DateSelectorProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const today = startOfToday();

    // Get all months from current month to December
    const currentMonthIndex = getMonth(today);
    const currentYear = getYear(today);
    const months = Array.from({ length: 12 - currentMonthIndex }).map((_, i) => {
        const monthDate = new Date(currentYear, currentMonthIndex + i, 1);
        return {
            date: monthDate,
            label: format(monthDate, 'MMMM', { locale: ptBR })
        };
    });

    const [activeMonth, setActiveMonth] = useState(
        selectedDate ? startOfMonth(selectedDate) : startOfMonth(today)
    );

    // Days for the active month
    const days = eachDayOfInterval({
        start: startOfMonth(activeMonth),
        end: endOfMonth(activeMonth)
    }).filter(date => {
        const isNotPast = isSameDay(date, today) || isAfter(date, today);
        const dayOfWeek = date.getDay();
        const isWorkingDay = dayOfWeek !== 0 && dayOfWeek !== 1; // 0=Sunday, 1=Monday
        return isNotPast && isWorkingDay;
    });

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 200;
            scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className="space-y-6">
            {/* Seletor de Mês */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
                {months.map((m) => {
                    const isSelected = getMonth(m.date) === getMonth(activeMonth);
                    return (
                        <button
                            key={m.label}
                            onClick={() => setActiveMonth(m.date)}
                            className={cn(
                                "px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border-2",
                                isSelected
                                    ? "bg-slate-900 border-slate-900 text-white shadow-md"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                            )}
                        >
                            {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
                        </button>
                    );
                })}
            </div>

            <div className="relative w-full group">
                {/* Botões de Scroll */}
                <button
                    onClick={() => scroll('left')}
                    className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md p-1 rounded-full border border-slate-100 hover:bg-slate-50 text-slate-400"
                >
                    <ChevronLeft size={20} />
                </button>

                <button
                    onClick={() => scroll('right')}
                    className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md p-1 rounded-full border border-slate-100 hover:bg-slate-50 text-slate-400"
                >
                    <ChevronRight size={20} />
                </button>

                {/* Lista Horizontal de Dias */}
                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto scrollbar-hide px-1 py-4 snap-x snap-mandatory"
                >
                    {days.length === 0 ? (
                        <div className="w-full text-center py-4 text-slate-400 text-sm italic">
                            Sem datas disponíveis para este mês.
                        </div>
                    ) : (
                        days.map((date) => {
                            const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;

                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => onSelect(date)}
                                    className={cn(
                                        "flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all snap-start",
                                        isSelected
                                            ? "bg-primary border-primary text-white shadow-lg shadow-yellow-500/20 transform scale-105"
                                            : "bg-white border-slate-100 text-slate-500 hover:border-primary/50"
                                    )}
                                >
                                    <span className="text-[10px] font-bold uppercase opacity-70">
                                        {isToday(date) ? 'Hoje' : format(date, 'EEE', { locale: ptBR }).slice(0, 3)}
                                    </span>
                                    <span className={cn("text-2xl font-black font-sans mt-0.5", isSelected ? "text-white" : "text-slate-800")}>
                                        {format(date, 'd')}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
