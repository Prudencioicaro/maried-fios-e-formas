import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useProcedures } from '../hooks/useProcedures';
import { useAvailability } from '../hooks/useAvailability';
import { DateSelector } from '../components/DateSelector';
import { PortfolioGallery } from '../components/PortfolioGallery';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';
import { supabase } from '../lib/supabase';
import type { Procedure } from '../types/database';

// Maried's WhatsApp
const OWNER_PHONE = "5513997531418";

// Map URL slugs to database category values
const CATEGORY_MAP: Record<string, string> = {
    'corte-tratamentos': 'Corte e Tratamentos',
    'coloracao': 'Coloração',
    'mechas': 'Mechas',
    'botox': 'Botox',
    'selagem': 'Selagem',
    'penteados': 'Penteado'
};

export default function Agendar() {
    const { category: categorySlug } = useParams<{ category: string }>();
    const navigate = useNavigate();

    // Convert URL slug to database category name
    const dbCategory = categorySlug ? CATEGORY_MAP[categorySlug] : undefined;
    const categoryName = dbCategory || 'Serviços';

    const { procedures, loading: loadingProcedures } = useProcedures(dbCategory || '');

    const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs for auto-scroll
    const agendaRef = useRef<HTMLDivElement>(null);
    const identificationRef = useRef<HTMLElement>(null);

    const duration = selectedProcedure?.duration_minutes || 0;
    const { availableSlots, loading: loadingSlots } = useAvailability(selectedDate, duration);

    // Handle procedure selection with auto-scroll
    const handleProcedureSelect = (proc: Procedure) => {
        setSelectedProcedure(proc);
        // Reset date/time when changing procedure
        setSelectedDate(null);
        setSelectedTime(null);

        // Auto-scroll to summary card (appears after selection)
        setTimeout(() => {
            if (agendaRef.current) {
                const yOffset = -20; // Slight offset from top
                const y = agendaRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }, 100);
    };

    // Handle time selection with auto-scroll
    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);

        // Auto-scroll to identification section
        setTimeout(() => {
            if (identificationRef.current) {
                const yOffset = -20;
                const y = identificationRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }, 100);
    };

    const handleConfirm = async () => {
        if (!selectedProcedure || !selectedDate || !selectedTime || !clientName || !clientPhone) return;

        try {
            setIsSubmitting(true);

            // 1. Data Parsing
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const startTime = new Date(selectedDate);
            startTime.setHours(hours, minutes, 0, 0);

            const endTime = addMinutes(startTime, duration);

            // 2. Insert into Supabase (Pending)
            const { data, error } = await supabase.from('appointments').insert({
                client_name: clientName,
                client_phone: clientPhone,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'pending',
                procedure_id: selectedProcedure.id,
            }).select().single();

            if (error) throw error;

            // 3. Construct message for WhatsApp
            const siteUrl = window.location.origin;
            const manageLink = `${siteUrl}/dashboard?confirm=${data.id}`;

            const message = `*NOVA SOLICITACAO DE AGENDAMENTO*\n\n- Cliente: ${clientName}\n- Servico: ${selectedProcedure.name}\n- Data: ${format(startTime, "dd/MM (EEEE)", { locale: ptBR })}\n- Horario: ${selectedTime}\n\nLink para voce gerenciar: ${manageLink}`;

            window.location.href = `https://wa.me/${OWNER_PHONE}?text=${encodeURIComponent(message)}`;

        } catch (err) {
            alert('Erro ao agendar. Tente novamente.');
            console.error(err);
            setIsSubmitting(false);
        }
    };

    if (loadingProcedures) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="animate-spin text-amber-300" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pb-24 relative">
            {/* Elegant Background - Diagonal Grid Pattern */}
            <div className="fixed inset-0 pointer-events-none z-[1]">
                {/* Diagonal Lines */}
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        linear-gradient(45deg, transparent 0%, transparent calc(50% - 0.5px), rgba(251, 191, 36, 0.06) calc(50% - 0.5px), rgba(251, 191, 36, 0.06) calc(50% + 0.5px), transparent calc(50% + 0.5px), transparent 100%),
                        linear-gradient(-45deg, transparent 0%, transparent calc(50% - 0.5px), rgba(251, 191, 36, 0.06) calc(50% - 0.5px), rgba(251, 191, 36, 0.06) calc(50% + 0.5px), transparent calc(50% + 0.5px), transparent 100%)
                    `,
                    backgroundSize: '100px 100px'
                }}></div>

                {/* Dots at Intersections */}
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 1.5px, transparent 1.5px)',
                    backgroundSize: '50px 50px',
                    backgroundPosition: '0 0'
                }}></div>
            </div>

            {/* 1. HEADER - Dark Luxury */}
            <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-xl">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    {/* Logo */}
                    <img
                        src="/logo-full.png"
                        alt="Maried"
                        className="h-12 w-auto brightness-110 contrast-125"
                        style={{ filter: 'drop-shadow(0 0 15px rgba(232, 220, 196, 0.4))' }}
                    />

                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 hover:border-amber-300/50"
                    >
                        <ArrowLeft size={18} className="text-amber-300" />
                        <span className="text-sm font-bold text-white uppercase tracking-wider">Voltar</span>
                    </button>
                </div>

                {/* Category Title */}
                <div className="max-w-4xl mx-auto px-6 pb-4">
                    <h1 className="text-3xl font-black text-amber-300 uppercase tracking-tight">
                        {categoryName}
                    </h1>
                </div>
            </div>

            {/* 2. VITRINE - Carrossel de Fotos */}
            <div className="bg-slate-900 border-b border-slate-800 relative z-10">
                <div className="max-w-4xl mx-auto px-6 py-6">
                    <div className="mb-2 uppercase text-[10px] font-bold text-slate-400 tracking-widest mt-2">
                        Nossos Resultados
                    </div>
                    <PortfolioGallery />
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 mt-8 space-y-8">

                {/* 3. SELEÇÃO DO SERVIÇO */}
                <section>
                    {!selectedProcedure ? (
                        // Full List - Before Selection
                        <>
                            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">
                                Escolha seu Procedimento
                            </h2>
                            <div className="space-y-4">
                                {procedures.length === 0 && (
                                    <p className="text-slate-400 text-center py-12 italic">
                                        Nenhum serviço encontrado nesta categoria.
                                    </p>
                                )}
                                {procedures.map((proc) => (
                                    <button
                                        key={proc.id}
                                        onClick={() => handleProcedureSelect(proc)}
                                        className="w-full text-left p-6 rounded-2xl border border-slate-700 bg-slate-900 hover:border-amber-300 hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 hover:shadow-xl hover:shadow-amber-500/10"
                                    >
                                        {/* Radio Circle */}
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-slate-600"></div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="font-black text-white text-lg flex items-center gap-2 flex-wrap">
                                                        {proc.name}
                                                        {proc.is_package && (
                                                            <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">
                                                                Pacote
                                                            </span>
                                                        )}
                                                    </div>
                                                    {proc.description && (
                                                        <div className="text-slate-400 text-sm mt-2">
                                                            {proc.description}
                                                        </div>
                                                    )}
                                                    <div className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
                                                        {proc.duration_minutes} minutos
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className="text-2xl font-black text-amber-300">
                                                        {formatCurrency(proc.price)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        // Collapsed Summary Card - After Selection
                        <div ref={agendaRef} className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="bg-slate-900 rounded-2xl border-2 border-amber-300 p-6 shadow-xl shadow-amber-500/20">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-5 h-5 rounded-full bg-amber-300 flex items-center justify-center flex-shrink-0">
                                                <Check size={12} className="text-slate-900 font-black" />
                                            </div>
                                            <h3 className="text-xl font-black text-white">
                                                {selectedProcedure.name}
                                            </h3>
                                            {selectedProcedure.is_package && (
                                                <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">
                                                    Pacote
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-6 text-sm text-slate-300">
                                            <span className="font-semibold uppercase tracking-wider">
                                                {formatCurrency(selectedProcedure.price)}
                                            </span>
                                            <span className="font-semibold uppercase tracking-wider">
                                                {selectedProcedure.duration_minutes} min
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedProcedure(null);
                                            setSelectedDate(null);
                                            setSelectedTime(null);
                                        }}
                                        className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-black text-amber-300 hover:border-amber-300 hover:bg-slate-700 transition-all uppercase tracking-wider"
                                    >
                                        Alterar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* 4. AGENDA - Aparece após seleção */}
                {selectedProcedure && (
                    <section ref={agendaRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                            <CalendarIcon size={28} className="text-amber-300" />
                            Escolha Data e Horário
                        </h2>

                        <div className="mb-8">
                            <DateSelector selectedDate={selectedDate} onSelect={setSelectedDate} />
                        </div>

                        {selectedDate && (
                            <div className="space-y-6 animate-in fade-in zoom-in-50 duration-300">
                                <div className="grid grid-cols-3 gap-3">
                                    {loadingSlots ? (
                                        <div className="col-span-3 py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin text-amber-300" size={32} />
                                            <span className="text-sm font-medium uppercase tracking-wider">Buscando horários...</span>
                                        </div>
                                    ) : availableSlots.length > 0 ? (
                                        availableSlots.map(time => (
                                            <button
                                                key={time}
                                                onClick={() => handleTimeSelect(time)}
                                                className={`py-4 rounded-xl text-base font-bold border transition-all ${selectedTime === time
                                                    ? 'bg-amber-300 text-slate-900 border-amber-300 shadow-lg shadow-amber-500/30'
                                                    : 'bg-slate-900 border-slate-700 text-white hover:border-amber-300'
                                                    }`}
                                            >
                                                {time}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="col-span-3 py-8 text-center text-amber-300 bg-slate-900 rounded-2xl text-sm font-medium border border-amber-300/30 uppercase tracking-wider">
                                            Agenda lotada para este dia
                                        </div>
                                    )}
                                </div>

                                {/* WhatsApp CTA */}
                                <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl flex flex-col items-center text-center gap-4">
                                    <p className="text-white text-sm font-bold uppercase tracking-wider">
                                        Não encontrou o horário ideal?
                                    </p>
                                    <p className="text-slate-400 text-xs">
                                        Entre em contato pelo WhatsApp para verificar disponibilidade
                                    </p>
                                    <a
                                        href={`https://wa.me/${OWNER_PHONE}?text=Olá! Não encontrei um horário disponível no site, você teria alguma vaga extra?`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-emerald-500 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg"
                                    >
                                        Chamar no WhatsApp
                                    </a>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* 5. IDENTIFICAÇÃO - Aparece após selecionar horário */}
                {selectedTime && (
                    <section ref={identificationRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">
                            Seus Dados
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-black text-amber-300 uppercase tracking-wider mb-3">
                                    Nome Completo
                                </label>
                                <input
                                    type="text"
                                    className="w-full h-14 px-6 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-300 focus:ring-0 text-base font-medium text-white placeholder:text-slate-500 transition-all"
                                    placeholder="Digite seu nome"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-black text-amber-300 uppercase tracking-wider mb-3">
                                    WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    className="w-full h-14 px-6 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-300 focus:ring-0 text-base font-medium text-white placeholder:text-slate-500 transition-all"
                                    placeholder="(00) 00000-0000"
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(e.target.value)}
                                />
                            </div>

                            {/* CTA Final */}
                            <Button
                                size="lg"
                                onClick={handleConfirm}
                                disabled={!clientName || !clientPhone || isSubmitting}
                                className="w-full h-16 mt-6 text-lg font-black rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-900 shadow-xl shadow-amber-500/30 border-none transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" size={20} />
                                        Processando...
                                    </>
                                ) : (
                                    'Confirmar Agendamento'
                                )}
                            </Button>

                            <p className="text-center text-xs text-slate-500 mt-4 uppercase tracking-wider">
                                Pagamento no local após o atendimento
                            </p>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
