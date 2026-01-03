import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Procedure } from '../types/database';
import { Button } from './ui/Button';
import { X, Calendar as CalendarIcon, Clock, User, Check } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { cn } from '../lib/utils';

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export function ManualAppointmentModal({ onClose, onSuccess }: Props) {
    const [procedures, setProcedures] = useState<Procedure[]>([]);

    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [selectedProcedureId, setSelectedProcedureId] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [time, setTime] = useState(format(new Date(), 'HH:mm'));
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function load() {
            const { data } = await supabase.from('procedures').select('*').order('name');
            setProcedures(data || []);
        }
        load();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProcedureId || !clientName) return;

        setIsSubmitting(true);
        try {
            const proc = procedures.find(p => p.id === selectedProcedureId);
            if (!proc) return;

            const startTime = new Date(`${date}T${time}`);
            const endTime = addMinutes(startTime, proc.duration_minutes);

            const { error } = await supabase.from('appointments').insert({
                client_name: clientName,
                client_phone: clientPhone || 'Manual',
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'confirmed',
                procedure_id: selectedProcedureId,
            });

            if (error) throw error;
            onSuccess();
        } catch (err) {
            alert('Erro ao criar agendamento manual');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-8 border-b border-white/5 bg-slate-950/50">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
                        Novo Encaixe Manual
                    </h3>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20 sm:pb-0">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    required
                                    className="w-full h-14 pl-12 pr-6 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold focus:ring-2 focus:ring-amber-400/20 outline-none"
                                    placeholder="Nome da cliente"
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone (Opcional)</label>
                            <input
                                type="tel"
                                className="w-full h-14 px-6 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold focus:ring-2 focus:ring-amber-400/20 outline-none"
                                placeholder="(00) 00000-0000"
                                value={clientPhone}
                                onChange={e => setClientPhone(e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Procedimento</label>
                            <select
                                required
                                className="w-full h-14 px-6 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold focus:ring-2 focus:ring-amber-400/20 outline-none appearance-none"
                                value={selectedProcedureId}
                                onChange={e => setSelectedProcedureId(e.target.value)}
                            >
                                <option value="" className="bg-slate-900">Selecione um serviço...</option>
                                {procedures.map(p => (
                                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name} ({p.duration_minutes}min)</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="date"
                                    required
                                    className="w-full h-14 pl-12 pr-6 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold focus:ring-2 focus:ring-amber-400/20 outline-none"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Horário</label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="time"
                                    required
                                    className="w-full h-14 pl-12 pr-6 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold focus:ring-2 focus:ring-amber-400/20 outline-none"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-4 pb-10 sm:pb-0">
                            <Button type="submit" isLoading={isSubmitting} className="w-full h-16 rounded-2xl bg-amber-400 text-slate-900 font-black text-lg shadow-xl shadow-amber-500/20 hover:scale-[1.02] transition-all">
                                <Check className="mr-2" size={24} /> Confirmar Encaixe
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
