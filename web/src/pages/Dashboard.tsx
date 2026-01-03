import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import {
    Check, X, Calendar, DollarSign, Users,
    PieChart as PieChartIcon, Clock, LogOut, ChevronRight, Sparkles, Loader2,
    Search, Inbox, Plus, Trash2, Edit3, ChevronLeft, Trash, Settings, Zap
} from 'lucide-react';
import {
    ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
    format, startOfDay, endOfDay, startOfWeek, endOfWeek,
    startOfMonth, endOfMonth, parseISO, isSameMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ManualAppointmentModal } from '../components/ManualAppointmentModal';
import type { Appointment } from '../types/database';
import confetti from 'canvas-confetti';

const triggerConfetti = () => {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FBBF24', '#FFFFFF']
    });
};

const Skeleton = ({ className }: { className?: string }) => (
    <div className={cn("skeleton", className)} />
);

// Helper to format WhatsApp message
const sendWhatsAppConfirmation = (phone: string, name: string, procedure: string, date: string, time: string, isAdjustment: boolean = false) => {
    const title = isAdjustment ? '*AJUSTE DE HORARIO*' : '*AGENDAMENTO CONFIRMADO!*';
    const body = isAdjustment
        ? `Ola *${name}*!\nPrecisei realizar um pequeno ajuste no horario do seu atendimento de *${procedure}*.\n\n*Nova Data:* ${date}\n*Novo Horario:* ${time}\n\nTudo bem para voce? Aguardo seu ok!`
        : `Ola *${name}*!\nTudo pronto para o seu atendimento de *${procedure}*.\n\n*Data:* ${date}\n*Horario:* ${time}\n\n*Local:* Maried Salao (Santos/SP)\n\nMal posso esperar para te atender!`;

    const message = `${title}\n\n${body}`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
};

export default function Dashboard() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManualModal, setShowManualModal] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [view, setView] = useState<'stats' | 'agenda' | 'requests' | 'procedures' | 'settings'>('stats');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
    const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<{ name: string, phone: string } | null>(null);
    const [procedures, setProcedures] = useState<any[]>([]);
    const [blockages, setBlockages] = useState<any[]>([]);
    const [editingProcedure, setEditingProcedure] = useState<any | null>(null);
    const [showProcedureModal, setShowProcedureModal] = useState(false);
    const [showMonthlyPicker, setShowMonthlyPicker] = useState(false);
    const [showFocusMode, setShowFocusMode] = useState(false);
    const [focusIndex, setFocusIndex] = useState(0);
    const [pickerMonth, setPickerMonth] = useState(new Date());
    const [agendaDate, setAgendaDate] = useState(new Date());
    const [stats, setStats] = useState({
        totalEarnings: 0,
        totalCount: 0,
        participation: [] as { name: string, value: number }[],
        revenuePerService: [] as { name: string, value: number }[]
    });

    const loadData = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('appointments')
                .select('*, procedure:procedures(*)')
                .order('start_time', { ascending: false });

            // Apply Date Filters
            const now = new Date();
            if (dateFilter === 'today') {
                query = query.gte('start_time', startOfDay(now).toISOString())
                    .lte('start_time', endOfDay(now).toISOString());
            } else if (dateFilter === 'week') {
                query = query.gte('start_time', startOfWeek(now, { weekStartsOn: 0 }).toISOString())
                    .lte('start_time', endOfWeek(now, { weekStartsOn: 0 }).toISOString());
            } else if (dateFilter === 'month') {
                query = query.gte('start_time', startOfMonth(now).toISOString())
                    .lte('start_time', endOfMonth(now).toISOString());
            } else if (dateFilter === 'custom' && customDate) {
                const picked = parseISO(customDate);
                query = query.gte('start_time', startOfDay(picked).toISOString())
                    .lte('start_time', endOfDay(picked).toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;
            setAppointments(data || []);

            // Fetch Procedures
            const { data: procData, error: procError } = await supabase
                .from('procedures')
                .select('*')
                .order('category', { ascending: true });

            if (procError) throw procError;
            setProcedures(procData || []);

            // 3. Load Blockages
            const { data: blockData } = await supabase.from('blocked_slots').select('*');
            setBlockages(blockData || []);

            // Calculate Stats for the current (filtered) view
            const confirmed = (data || []).filter(a => a.status === 'confirmed');
            const totalEarnings = confirmed.reduce((acc, curr) => acc + (curr.procedure?.price || 0), 0);

            const counts: Record<string, number> = {};
            const revenues: Record<string, number> = {};

            confirmed.forEach(a => {
                const cat = a.procedure?.category || 'Outros';
                const serviceName = a.procedure?.name || 'Outros';
                const price = a.procedure?.price || 0;

                counts[cat] = (counts[cat] || 0) + 1;
                revenues[serviceName] = (revenues[serviceName] || 0) + price;
            });

            const participation = Object.entries(counts).map(([name, value]) => ({ name, value }));
            const revenuePerService = Object.entries(revenues)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            setStats({
                totalEarnings,
                totalCount: confirmed.length,
                participation,
                revenuePerService
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Detect 'confirm' parameter from URL
        const params = new URLSearchParams(window.location.search);
        const confirmId = params.get('confirm');
        if (confirmId) {
            setView('requests');
            // We could also highlight it or auto-scroll
        }

        // Realtime subscription
        const channel = supabase.channel('dashboard-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
                loadData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [dateFilter, customDate]);

    const filteredAppointments = appointments.filter(app =>
        app.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const updateStatus = async (appointment: Appointment, status: Appointment['status']) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status })
                .eq('id', appointment.id);

            if (error) throw error;

            if (status === 'confirmed') {
                triggerConfetti();
                const day = format(new Date(appointment.start_time), "dd/MM");
                const hour = format(new Date(appointment.start_time), "HH:mm");
                sendWhatsAppConfirmation(appointment.client_phone, appointment.client_name, appointment.procedure?.name || '', day, hour);
            }
        } catch (err) {
            alert('Erro ao atualizar status');
        }
    };

    const handleAdjust = async (appointment: Appointment, newStartTime: string) => {
        try {
            const procedure = appointment.procedure;
            const duration = procedure?.duration_minutes || 30;
            const start = new Date(newStartTime);
            const end = new Date(start.getTime() + duration * 60000);

            const { error } = await supabase
                .from('appointments')
                .update({
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                    status: 'confirmed'
                })
                .eq('id', appointment.id);

            if (error) throw error;

            triggerConfetti();
            const day = format(start, "dd/MM");
            const hour = format(start, "HH:mm");
            sendWhatsAppConfirmation(
                appointment.client_phone,
                appointment.client_name,
                procedure?.name || '',
                day,
                hour,
                true
            );
            setEditingAppointment(null);
            loadData();
        } catch (err) {
            alert('Erro ao ajustar agendamento');
        }
    };

    const handleSaveProcedure = async (formData: any) => {
        try {
            const { error } = editingProcedure
                ? await supabase.from('procedures').update(formData).eq('id', editingProcedure.id)
                : await supabase.from('procedures').insert(formData);

            if (error) throw error;
            triggerConfetti();
            setShowProcedureModal(false);
            setEditingProcedure(null);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar procedimento. Verifique se preencheu todos os campos.');
        }
    };

    const handleDeleteProcedure = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
        try {
            const { error } = await supabase.from('procedures').delete().eq('id', id);
            if (error) throw error;
            loadData();
        } catch (err) {
            alert('Erro ao excluir procedimento');
        }
    };

    const handleSaveBlockage = async (formData: any) => {
        try {
            const { error } = await supabase.from('blocked_slots').insert(formData);
            if (error) throw error;
            loadData();
        } catch (err) {
            alert('Erro ao salvar bloqueio. Verifique se a tabela blocked_slots existe.');
        }
    };

    const handleDeleteBlockage = async (id: string) => {
        try {
            const { error } = await supabase.from('blocked_slots').delete().eq('id', id);
            if (error) throw error;
            loadData();
        } catch (err) {
            alert('Erro ao excluir bloqueio');
        }
    };

    const groupedProcedures = procedures.reduce((acc, curr) => {
        const cat = curr.category || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {} as Record<string, any[]>);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-amber-400 selection:text-slate-900 pb-24 lg:pb-0">
            {/* Elegant Background - Diagonal Grid Pattern */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Diagonal Lines */}
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        linear-gradient(45deg, transparent 0%, transparent calc(50% - 0.5px), rgba(251, 191, 36, 0.03) calc(50% - 0.5px), rgba(251, 191, 36, 0.03) calc(50% + 0.5px), transparent calc(50% + 0.5px), transparent 100%),
                        linear-gradient(-45deg, transparent 0%, transparent calc(50% - 0.5px), rgba(251, 191, 36, 0.03) calc(50% - 0.5px), rgba(251, 191, 36, 0.03) calc(50% + 0.5px), transparent calc(50% + 0.5px), transparent 100%)
                    `,
                    backgroundSize: '100px 100px'
                }}></div>

                {/* Dots at Intersections */}
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle, rgba(251, 191, 36, 0.08) 1.5px, transparent 1.5px)',
                    backgroundSize: '50px 50px',
                    backgroundPosition: '0 0'
                }}></div>
            </div>

            {/* Sidebar / Topbar Admin - Desktop Only */}
            <aside className="hidden lg:flex w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 p-8 flex-col fixed inset-y-0 left-0 z-50">

                <div>
                    <h1 className="text-xl font-black mb-8 flex items-center gap-2">
                        <span className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg flex items-center justify-center text-slate-900 text-xs shadow-lg shadow-amber-500/20">M</span>
                        <span className="bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">Maried Salão</span>
                    </h1>


                    <nav className="space-y-1">
                        <button
                            onClick={() => setView('stats')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                                view === 'stats' ? "bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <PieChartIcon size={20} className={view === 'stats' ? "" : "text-amber-400/80"} /> Dashboard
                        </button>

                        <button
                            onClick={() => setView('agenda')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                                view === 'agenda' ? "bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <Calendar size={20} className="text-amber-400 group-active:scale-95 transition-transform" /> Agenda
                        </button>
                        <button
                            onClick={() => setView('requests')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all relative",
                                view === 'requests' ? "bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <Inbox size={20} className={view === 'requests' ? "" : "text-amber-400/80"} /> Solicitações
                            {appointments.filter(a => a.status === 'pending').length > 0 && (
                                <span className={cn(
                                    "absolute right-4 w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse",
                                    view === 'requests' ? "bg-slate-900 text-amber-400" : "bg-amber-500 text-slate-950"
                                )}>
                                    {appointments.filter(a => a.status === 'pending').length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setView('procedures')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                                view === 'procedures' ? "bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <Sparkles size={20} className={view === 'procedures' ? "" : "text-amber-400/80"} /> Serviços
                        </button>
                        <button
                            onClick={() => setView('settings')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                                view === 'settings' ? "bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <Settings size={20} className={view === 'settings' ? "" : "text-amber-400/80"} /> Bloqueios
                        </button>
                    </nav>

                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 transition-colors mt-auto"
                >
                    <LogOut size={20} /> Sair
                </button>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-72 flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">

                <header className="mb-10 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex justify-between items-center w-full sm:w-auto">
                            <h2 className="text-4xl font-black text-white tracking-tight leading-tight">
                                {view === 'stats' ? 'Olá, Maried! 👋' :
                                    view === 'agenda' ? 'Sua Agenda 📅' :
                                        view === 'requests' ? 'Novas Solicitações 📥' :
                                            view === 'procedures' ? 'Catálogo de Serviços ✨' :
                                                'Bloqueios de Agenda 🔒'}
                            </h2>
                            <button
                                onClick={handleLogout}
                                className="lg:hidden p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-3 w-full lg:w-auto lg:flex-row items-center">
                            <Button
                                onClick={() => setShowFocusMode(true)}
                                className="h-12 lg:h-14 w-full lg:w-auto px-6 rounded-xl lg:rounded-2xl bg-slate-800 hover:bg-slate-700 text-white shadow-xl shadow-slate-900/20 text-sm lg:text-lg font-bold border border-white/5 transition-all hover:scale-105 flex items-center justify-center gap-2"
                            >
                                <Zap size={18} className="text-amber-400 fill-amber-400" /> Modo Atendimento
                            </Button>
                            <Button
                                onClick={() => setShowManualModal(true)}
                                className="h-12 lg:h-14 w-full lg:w-auto px-8 rounded-xl lg:rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-900 shadow-xl shadow-amber-500/20 text-sm lg:text-lg font-bold border-none transition-all hover:scale-105"
                            >
                                + Novo Encaixe
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 items-center bg-slate-900/50 backdrop-blur-xl p-3 rounded-[2rem] border border-slate-800 shadow-sm relative z-10">
                        {/* Search Bar */}
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-12 pl-12 pr-6 rounded-2xl bg-slate-950/50 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/20 w-full text-slate-200 font-medium placeholder:text-slate-600"
                            />
                        </div>

                        {/* Divider for Desktop */}
                        <div className="hidden lg:block w-px h-8 bg-slate-800"></div>

                        {/* Date Filters Switcher */}
                        <div className="flex items-center gap-1 p-1 bg-slate-950/50 rounded-2xl w-full lg:w-auto overflow-x-auto border border-slate-800">
                            {[
                                { id: 'all', label: 'Tudo' },
                                { id: 'today', label: 'Hoje' },
                                { id: 'week', label: 'Semana' },
                                { id: 'month', label: 'Mês' },
                                { id: 'custom', label: 'Calendário' }
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setDateFilter(f.id as any)}
                                    className={cn(
                                        "px-5 h-10 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                        dateFilter === f.id
                                            ? "bg-amber-400 text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {dateFilter === 'custom' && (
                            <div className="relative w-full lg:w-auto animate-in fade-in slide-in-from-right-2">
                                <input
                                    type="date"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    className="h-12 px-6 rounded-2xl bg-amber-400/5 border border-amber-400/20 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all text-amber-400 font-bold w-full"
                                />
                            </div>
                        )}
                    </div>

                </header>

                {loading ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <Skeleton className="h-40 w-full rounded-3xl" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Skeleton className="h-32 rounded-3xl" />
                            <Skeleton className="h-32 rounded-3xl" />
                        </div>
                        <Skeleton className="h-80 w-full rounded-3xl" />
                    </div>
                ) : view === 'stats' ? (
                    <>
                        {/* KPI Cards */}
                        {/* Focus Mode Widget - Próximo Atendimento */}
                        {(() => {
                            const nextApp = appointments
                                .filter(a => a.status === 'confirmed' && new Date(a.start_time) > new Date())
                                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

                            if (!nextApp) return null;

                            return (
                                <div className="mb-8 relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
                                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-5 rounded-[2rem] shadow-sm hover:border-amber-400/20 transition-all">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-amber-400/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-400/20">
                                                    <Clock size={20} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Próximo</p>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-white tracking-tight truncate max-w-[150px] sm:max-w-[300px]">
                                                        {nextApp.client_name}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                        <span className="text-amber-400">{format(new Date(nextApp.start_time), "HH:mm")}</span>
                                                        <span>•</span>
                                                        <span className="truncate max-w-[100px] sm:max-w-none">{nextApp.procedure?.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full md:w-auto">
                                                <a
                                                    href={`https://wa.me/${nextApp.client_phone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    className="flex-1 md:flex-none h-10 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center transition-all active:scale-95 border border-emerald-500/20 whitespace-nowrap"
                                                >
                                                    WhatsApp
                                                </a>
                                                <button
                                                    onClick={() => setSelectedClient({ name: nextApp.client_name, phone: nextApp.client_phone })}
                                                    className="flex-1 md:flex-none h-10 px-4 bg-slate-800/50 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center hover:bg-slate-800 hover:text-white transition-all border border-white/5 active:scale-95 whitespace-nowrap"
                                                >
                                                    Perfil
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10 relative z-10">

                            <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-slate-800 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-8 text-amber-500/10 group-hover:scale-110 transition-transform">
                                    <DollarSign size={80} />
                                </div>
                                <p className="text-slate-400 font-semibold mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                    Faturamento Confirmado
                                </p>
                                {loading ? <Skeleton className="h-10 w-32 mt-2" /> : (
                                    <h3 className="text-4xl font-black text-amber-300 tracking-tight">{formatCurrency(stats.totalEarnings)}</h3>
                                )}
                            </div>

                            <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-slate-800 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-8 text-slate-500/10 group-hover:scale-110 transition-transform">
                                    <Users size={80} />
                                </div>
                                <p className="text-slate-400 font-semibold mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                                    Atendimentos Realizados
                                </p>
                                {loading ? <Skeleton className="h-10 w-16 mt-2" /> : (
                                    <h3 className="text-4xl font-black text-white tracking-tight">{stats.totalCount}</h3>
                                )}
                            </div>
                        </div>


                        <div className="grid grid-cols-1 gap-8 mb-10 relative z-10">
                            <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-slate-800 h-[450px]">
                                <h4 className="text-xl font-bold text-white mb-8 flex justify-between items-center">
                                    Revenue por Serviço (R$)
                                    <div className="flex items-center gap-2 bg-amber-400/10 text-amber-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-amber-400/20">
                                        <DollarSign size={14} /> Lucro Bruto
                                    </div>
                                </h4>
                                <div className="h-full pb-10">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.revenuePerService}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(val) => `R$${val}`}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(251, 191, 36, 0.05)' }}
                                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)', padding: '15px' }}
                                                itemStyle={{ color: '#fbbf24' }}
                                                formatter={(val: any) => [formatCurrency(Number(val)), 'Faturamento']}
                                            />
                                            <Bar dataKey="value" fill="#fbbf24" radius={[12, 12, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>


                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">

                            {/* Recent Appointments & Pending */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-800">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-xl font-bold text-white">Solicitações Pendentes</h4>
                                        <button
                                            onClick={() => setView('requests')}
                                            className="text-amber-400 text-xs font-black uppercase tracking-widest hover:underline"
                                        >
                                            Ver Todas
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {appointments.filter(a => a.status === 'pending').length === 0 ? (
                                            <div className="text-center py-12 text-slate-600">
                                                <Check className="mx-auto mb-2 opacity-20" size={40} />
                                                <p>Nenhuma solicitação pendente no momento.</p>
                                            </div>
                                        ) : (
                                            appointments.filter(a => a.status === 'pending').slice(0, 3).map(app => (
                                                <div key={app.id} className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-amber-400/30 transition-all">
                                                    <div className="flex gap-4 items-start">
                                                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-xs text-center min-w-[60px]">
                                                            <span className="block text-xs font-bold text-slate-500 uppercase">
                                                                {format(new Date(app.start_time), 'EEE', { locale: ptBR }).slice(0, 3)}
                                                            </span>
                                                            <span className="block text-xl font-black text-amber-400">
                                                                {format(new Date(app.start_time), 'dd')}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <button
                                                                onClick={() => setSelectedClient({ name: app.client_name, phone: app.client_phone })}
                                                                className="font-bold text-white text-lg leading-tight hover:text-amber-400 transition-colors text-left"
                                                            >
                                                                {app.client_name}
                                                            </button>
                                                            <div className="text-slate-400 text-sm font-medium flex items-center gap-1 mt-1">
                                                                <Clock size={14} className="text-amber-400" /> {format(new Date(app.start_time), 'HH:mm')} • {app.procedure?.name}
                                                            </div>
                                                            <a
                                                                href={`https://wa.me/${app.client_phone.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                className="text-amber-400/60 text-xs font-bold flex items-center gap-1 mt-2 hover:text-amber-400 transition-all"
                                                            >
                                                                WhatsApp do Cliente <ChevronRight size={12} />
                                                            </a>
                                                        </div>
                                                    </div>


                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => updateStatus(app, 'confirmed')}
                                                            className="flex-1 md:flex-none h-11 px-6 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20"
                                                        >
                                                            Confirmar
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingAppointment(app)}
                                                            className="flex-1 md:flex-none h-11 px-4 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl font-bold flex items-center justify-center transition-all"
                                                            title="Ajustar Horário"
                                                        >
                                                            <Clock size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => updateStatus(app, 'cancelled')}
                                                            className="flex-1 md:flex-none h-11 px-4 bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold flex items-center justify-center transition-all"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-800">
                                    <h4 className="text-xl font-bold text-white mb-6">Próximos Agendamentos</h4>
                                    <div className="space-y-3">
                                        {appointments.filter(a => a.status === 'confirmed').slice(0, 5).map(app => (
                                            <div key={app.id} className="flex items-center justify-between p-4 hover:bg-slate-800/50 rounded-2xl transition-all border border-transparent hover:border-slate-800">
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 border border-slate-700 font-black text-xs uppercase shadow-lg">
                                                        {app.client_name[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white">{app.client_name}</div>
                                                        <div className="text-xs text-slate-500 font-black uppercase tracking-widest mt-0.5">
                                                            {format(new Date(app.start_time), "dd/MM 'as' HH:mm")} • {app.procedure?.name}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-white font-black text-sm">{formatCurrency(app.procedure?.price || 0)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>


                            {/* Side Info */}
                            <div className="space-y-8 relative z-10">
                                <div className="bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-900 p-8 rounded-3xl shadow-xl shadow-amber-500/20 relative overflow-hidden group">
                                    <Sparkles className="absolute right-[-20px] top-[-20px] text-white/20 group-hover:scale-125 transition-transform duration-700" size={150} />
                                    <h4 className="text-3xl font-black mb-2 leading-tight tracking-tighter uppercase italic">Dica de Gestão</h4>
                                    <p className="text-slate-900/80 font-bold text-lg leading-snug">Você tem {appointments.filter(a => a.status === 'pending').length} novas solicitações. Responda rápido para garantir sua exclusividade!</p>
                                    <Button
                                        onClick={() => setView('requests')}
                                        className="mt-8 bg-slate-900 text-amber-400 hover:bg-slate-800 border-none w-full h-14 font-black transition-all hover:scale-105"
                                    >
                                        Acessar Agora
                                    </Button>
                                </div>
                            </div>


                        </div>
                    </>
                ) : view === 'agenda' ? (
                    <div className="space-y-6 relative z-10">
                        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-slate-800">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                                <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                                    <button
                                        onClick={() => {
                                            const d = new Date(agendaDate);
                                            d.setDate(d.getDate() - 1);
                                            setAgendaDate(d);
                                            setPickerMonth(d);
                                        }}
                                        className="p-3 hover:bg-slate-900 rounded-xl text-amber-400 transition-colors"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={() => setShowMonthlyPicker(true)}
                                        className="px-6 py-2 text-center min-w-[200px] hover:bg-slate-900 rounded-xl transition-all group"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <h4 className="text-xl font-black text-white italic uppercase tracking-widest leading-none">
                                                {format(agendaDate, "dd 'de' MMMM", { locale: ptBR })}
                                            </h4>
                                            <Calendar size={16} className="text-amber-400" style={{ color: '#fbbf24' }} />
                                        </div>
                                        <p className="text-amber-400/50 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
                                            {format(agendaDate, "EEEE", { locale: ptBR })}
                                        </p>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const d = new Date(agendaDate);
                                            d.setDate(d.getDate() + 1);
                                            setAgendaDate(d);
                                            setPickerMonth(d);
                                        }}
                                        className="p-3 hover:bg-slate-900 rounded-xl text-amber-400 transition-colors"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </div>
                                <Button
                                    onClick={() => setShowManualModal(true)}
                                    className="h-14 px-8 rounded-2xl bg-amber-400 text-slate-900 font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20"
                                >
                                    + NOVO ENCAIXE
                                </Button>
                            </div>

                            {/* Timeline View */}
                            <div className="relative border-t border-slate-800 pt-6">
                                {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(hour => {
                                    const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                                    const appointmentsAtHour = appointments.filter(a =>
                                        a.status === 'confirmed' &&
                                        format(new Date(a.start_time), 'yyyy-MM-dd') === format(agendaDate, 'yyyy-MM-dd') &&
                                        new Date(a.start_time).getHours() === hour
                                    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                                    const isBlocked = blockages.some(b => {
                                        const start = new Date(b.start_time);
                                        const end = new Date(b.end_time);
                                        const currentHour = new Date(agendaDate);
                                        currentHour.setHours(hour, 0, 0, 0);
                                        return currentHour >= start && currentHour < end;
                                    });

                                    return (
                                        <div key={hour} className="flex gap-6 min-h-[100px] border-b border-slate-800/30 group">
                                            <div className="w-20 pt-4 text-right">
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{hourStr}</span>
                                            </div>
                                            <div className="flex-1 py-1 relative">
                                                {isBlocked ? (
                                                    <div className="h-full bg-red-500/5 border-l-4 border-red-500/50 flex items-center px-6">
                                                        <div className="flex items-center gap-2 text-red-500/50">
                                                            <X size={16} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Horário Bloqueado</span>
                                                        </div>
                                                    </div>
                                                ) : appointmentsAtHour.length === 0 ? (
                                                    <div className="h-full border-l border-slate-800/50 group-hover:bg-slate-900/20 transition-colors flex items-center px-6 opacity-0 group-hover:opacity-100">
                                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">Horário Disponível</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2 py-2 border-l-4 border-amber-400 pl-4 bg-amber-400/5">
                                                        {appointmentsAtHour.map(app => (
                                                            <div key={app.id} className="flex justify-between items-center group/item">
                                                                <div>
                                                                    <p className="text-white font-black text-lg leading-none mb-1">
                                                                        {app.client_name}
                                                                        <span className="ml-3 text-[10px] text-amber-400 opacity-60 font-black uppercase tracking-widest">
                                                                            {format(new Date(app.start_time), "HH:mm")}
                                                                        </span>
                                                                    </p>
                                                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                                                        {app.procedure?.name} • {app.procedure?.duration_minutes} min
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSelectedClient({ name: app.client_name, phone: app.client_phone })}
                                                                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-amber-400/50 transition-all opacity-0 group-hover/item:opacity-100"
                                                                >
                                                                    <Users size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : view === 'requests' ? (
                    <div className="space-y-6 relative z-10">
                        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-slate-800 min-h-[500px]">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h4 className="text-2xl font-black text-white">Solicitações Pendentes</h4>
                                    <p className="text-slate-400 text-sm font-medium">Clientes aguardando sua confirmação</p>
                                </div>
                                <div className="bg-amber-400/10 text-amber-400 border border-amber-400/20 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                                    {appointments.filter(a => a.status === 'pending').length} aguardando
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {appointments.filter(a => a.status === 'pending').length === 0 ? (
                                    <div className="col-span-full py-24 text-center">
                                        <div className="w-20 h-20 bg-amber-400/5 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-400/10">
                                            <Check size={40} />
                                        </div>
                                        <h5 className="text-xl font-black text-white uppercase italic">Tudo em dia!</h5>
                                        <p className="text-slate-500">Você não possui solicitações pendentes no momento.</p>
                                    </div>
                                ) : (
                                    appointments.filter(a => a.status === 'pending').map(app => (
                                        <div key={app.id} className="p-6 rounded-3xl bg-slate-950/50 border border-slate-800 hover:border-amber-400/30 transition-all group lg:hover:scale-[1.02] duration-300">
                                            <div className="flex gap-4 items-start mb-6">
                                                <div className="bg-slate-900 p-4 rounded-2xl shadow-sm text-center min-w-[75px] border border-slate-800">
                                                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                        {format(new Date(app.start_time), 'EEE', { locale: ptBR })}
                                                    </span>
                                                    <span className="block text-3xl font-black text-amber-400">
                                                        {format(new Date(app.start_time), 'dd')}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <button
                                                        onClick={() => setSelectedClient({ name: app.client_name, phone: app.client_phone })}
                                                        className="font-bold text-white text-xl mb-1 hover:text-amber-400 transition-colors text-left"
                                                    >
                                                        {app.client_name}
                                                    </button>
                                                    <div className="text-slate-400 font-medium flex items-center gap-2">
                                                        <Clock size={16} className="text-amber-400/50" />
                                                        {format(new Date(app.start_time), 'HH:mm')} • {app.procedure?.name}
                                                    </div>
                                                </div>
                                            </div>


                                            <div className="flex flex-col gap-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => updateStatus(app, 'confirmed')}
                                                        className="flex-1 h-12 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                                                    >
                                                        Confirmar e Avisar
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingAppointment(app)}
                                                        className="h-12 px-4 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-2xl font-bold flex items-center justify-center transition-all"
                                                        title="Ajustar Horário"
                                                    >
                                                        <Clock size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(app, 'cancelled')}
                                                        className="h-12 px-4 bg-transparent hover:bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-bold flex items-center justify-center transition-all"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                                <a
                                                    href={`https://wa.me/${app.client_phone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    className="w-full h-12 bg-slate-900 border border-slate-800 hover:border-amber-400/30 text-amber-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all"
                                                >
                                                    Chamar no WhatsApp
                                                </a>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                ) : view === 'procedures' ? (
                    <div className="space-y-12 relative z-10">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div>
                                <h4 className="text-3xl font-black text-white italic uppercase tracking-tighter">Catálogo de Serviços</h4>
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Gerencie preços, tempos e categorias</p>
                            </div>
                            <Button
                                onClick={() => { setEditingProcedure(null); setShowProcedureModal(true); }}
                                className="h-14 px-8 rounded-2xl bg-amber-400 text-slate-900 font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 whitespace-nowrap w-full sm:w-auto"
                            >
                                + Adicionar Serviço
                            </Button>
                        </div>

                        {Object.entries(groupedProcedures).map(([category, procs]) => (
                            <div key={category} className="space-y-6">
                                <h5 className="text-amber-400 text-xs font-black uppercase tracking-[0.5em] flex items-center gap-4">
                                    {category}
                                    <div className="flex-1 h-px bg-amber-400/20"></div>
                                </h5>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {(procs as any[]).map((p: any) => (
                                        <div key={p.id} className="p-8 rounded-[2.5rem] bg-slate-900/40 backdrop-blur-xl border border-slate-800 hover:border-amber-400/30 transition-all group relative overflow-hidden">
                                            <div className="absolute right-[-10px] top-[-10px] text-amber-400/5 group-hover:scale-110 transition-transform duration-700">
                                                <Sparkles size={100} />
                                            </div>

                                            <div className="flex justify-between items-start mb-6 relative z-10">
                                                <span className="px-3 py-1 bg-slate-950 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-800">
                                                    {p.duration_minutes} min
                                                </span>
                                                <div className="flex gap-2 transition-all">
                                                    <button
                                                        onClick={() => { setEditingProcedure(p); setShowProcedureModal(true); }}
                                                        className="p-3 bg-white/10 hover:bg-amber-400 text-amber-400 hover:text-slate-900 rounded-xl transition-all border border-amber-400/20"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProcedure(p.id)}
                                                        className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <h5 className="text-2xl font-black text-white mb-2 leading-tight uppercase tracking-tighter">{p.name}</h5>
                                            <p className="text-slate-500 text-sm font-medium line-clamp-2 h-10 mb-8">{p.description || "Nenhuma descrição informada."}</p>

                                            <div className="pt-6 border-t border-slate-800/50 flex justify-between items-end">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Investimento</p>
                                                    <p className="text-3xl font-black text-amber-400 leading-none">{formatCurrency(p.price)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : view === 'settings' ? (
                    <div className="space-y-12 relative z-10">
                        <div className="flex flex-col md:flex-row gap-12">
                            {/* New Blockage Form */}
                            <div className="flex-1 bg-slate-900/40 backdrop-blur-xl p-10 rounded-[3rem] border border-slate-800">
                                <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-8 flex items-center gap-3">
                                    <Calendar className="text-amber-400" size={24} style={{ color: '#fbbf24' }} /> Bloquear Período
                                </h4>

                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    handleSaveBlockage({
                                        start_time: fd.get('start'),
                                        end_time: fd.get('end'),
                                        reason: fd.get('reason')
                                    });
                                    (e.target as HTMLFormElement).reset();
                                }} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Início do Bloqueio</label>
                                            <input name="start" type="datetime-local" required className="w-full h-16 bg-slate-950 border border-slate-800 rounded-2xl px-6 text-white font-black focus:ring-2 focus:ring-amber-400/20" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Término do Bloqueio</label>
                                            <input name="end" type="datetime-local" required className="w-full h-16 bg-slate-950 border border-slate-800 rounded-2xl px-6 text-white font-black focus:ring-2 focus:ring-amber-400/20" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Motivo (Ficará visível para você)</label>
                                        <input name="reason" type="text" placeholder="Ex: Férias, Médico, Curso..." className="w-full h-16 bg-slate-950 border border-slate-800 rounded-2xl px-6 text-white font-bold placeholder:text-slate-800 focus:ring-2 focus:ring-amber-400/20" />
                                    </div>
                                    <button className="w-full h-18 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 transition-all h-16">
                                        Efetuar Bloqueio de Horário
                                    </button>
                                </form>
                            </div>

                            {/* Active Blockages List */}
                            <div className="w-full md:w-[400px] space-y-6">
                                <h5 className="text-xl font-black text-white italic uppercase tracking-tighter">Bloqueios Ativos</h5>
                                <div className="space-y-4">
                                    {blockages.filter(b => new Date(b.end_time) > new Date()).length === 0 ? (
                                        <div className="p-10 rounded-[2.5rem] border-2 border-dashed border-slate-800 text-center text-slate-600">
                                            <p className="font-bold text-xs uppercase tracking-widest">Nenhum bloqueio futuro</p>
                                        </div>
                                    ) : (
                                        blockages.filter(b => new Date(b.end_time) > new Date()).map(b => (
                                            <div key={b.id} className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl flex justify-between items-center group">
                                                <div>
                                                    <p className="text-white font-black text-sm uppercase italic mb-1">{b.reason || "Sem Motivo"}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                                                        {format(new Date(b.start_time), "dd/MM 'às' HH:mm")} até<br />
                                                        {format(new Date(b.end_time), "dd/MM 'às' HH:mm")}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteBlockage(b.id)}
                                                    className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 relative z-10">
                        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-slate-800">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-xl font-black text-white uppercase italic tracking-widest">Histórico de Agendamentos</h4>
                                <div className="flex gap-2">
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase">Confirmados</span>
                                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase">Cancelados</span>
                                </div>
                            </div>

                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-800">
                                            <th className="pb-4 font-black text-slate-500 text-[10px] uppercase pl-4 tracking-[0.2em]">Data/Hora</th>
                                            <th className="pb-4 font-black text-slate-500 text-[10px] uppercase tracking-[0.2em]">Cliente</th>
                                            <th className="pb-4 font-black text-slate-500 text-[10px] uppercase tracking-[0.2em]">Serviço</th>
                                            <th className="pb-4 font-black text-slate-500 text-[10px] uppercase text-right tracking-[0.2em]">Valor</th>
                                            <th className="pb-4 font-black text-slate-500 text-[10px] uppercase text-right pr-4 tracking-[0.2em]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {filteredAppointments.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-20 text-center text-slate-600">
                                                    <Search className="mx-auto mb-4 opacity-10" size={60} />
                                                    <p className="font-bold text-lg uppercase italic tracking-tighter">Nenhum agendamento encontrado.</p>
                                                    <button
                                                        onClick={() => { setSearchTerm(''); setDateFilter('all'); }}
                                                        className="mt-4 text-amber-400 font-black text-xs uppercase hover:underline"
                                                    >
                                                        Limpar todos os filtros
                                                    </button>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAppointments.map(app => (
                                                <tr key={app.id} className="group hover:bg-slate-800/30 transition-colors">
                                                    <td className="py-4 pl-4">
                                                        <div className="font-bold text-white tracking-widest leading-none mb-1">{format(new Date(app.start_time), 'dd/MM/yy')}</div>
                                                        <div className="text-[10px] font-black text-slate-500 uppercase">{format(new Date(app.start_time), 'HH:mm')}</div>
                                                    </td>
                                                    <td className="py-4">
                                                        <div className="font-bold text-white">{app.client_name}</div>
                                                        <div className="text-[10px] font-black text-slate-500 tracking-widest">{app.client_phone}</div>
                                                    </td>
                                                    <td className="py-4">
                                                        <div className="text-sm font-medium text-slate-400">{app.procedure?.name}</div>
                                                    </td>
                                                    <td className="py-4 text-right font-black text-amber-300">
                                                        {formatCurrency(app.procedure?.price || 0)}
                                                    </td>
                                                    <td className="py-4 text-right pr-4">
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                                            app.status === 'confirmed' ? "bg-amber-400 text-slate-900 shadow-md shadow-amber-400/10" :
                                                                app.status === 'pending' ? "bg-slate-800 text-amber-400 border border-slate-700" : "bg-transparent text-red-500 border border-red-500/20"
                                                        )}>
                                                            {app.status === 'confirmed' ? 'Confirmado' : app.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List */}
                            <div className="md:hidden space-y-4">
                                {filteredAppointments.length === 0 ? (
                                    <div className="py-10 text-center text-slate-600">
                                        <p className="font-bold uppercase italic tracking-tighter">Nenhum agendamento encontrado.</p>
                                    </div>
                                ) : (
                                    filteredAppointments.map(app => (
                                        <div key={app.id} className="p-5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-black text-white text-lg leading-tight mb-1">{app.client_name}</div>
                                                    <div className="text-[10px] font-black text-slate-500 tracking-[0.2em]">{app.client_phone}</div>
                                                </div>
                                                <span className={cn(
                                                    "px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest",
                                                    app.status === 'confirmed' ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" :
                                                        app.status === 'pending' ? "bg-slate-800 text-amber-400" : "text-red-500 bg-red-500/10 border border-red-500/20"
                                                )}>
                                                    {app.status === 'confirmed' ? 'Confirmado' : app.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Serviço</span>
                                                    <span className="text-xs font-bold text-slate-400">{app.procedure?.name}</span>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">{format(new Date(app.start_time), 'dd MMM')}</span>
                                                    <span className="text-sm font-black text-amber-300">{format(new Date(app.start_time), 'HH:mm')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                )}
            </main>

            {editingAppointment && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-md p-8 sm:p-10 animate-in slide-in-from-bottom sm:zoom-in duration-300 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Ajustar Horário</h3>
                            <button onClick={() => setEditingAppointment(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Cliente</p>
                                <p className="text-lg font-bold text-white">{editingAppointment.client_name}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-1">Novo Horário</label>
                                <input
                                    type="datetime-local"
                                    className="w-full h-14 bg-slate-950 border border-slate-800 rounded-2xl px-6 text-white text-lg font-bold focus:ring-2 focus:ring-amber-400/20"
                                    defaultValue={format(new Date(editingAppointment.start_time), "yyyy-MM-dd'T'HH:mm")}
                                    id="new-time-input"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 pb-safe">
                                <Button
                                    onClick={() => handleAdjust(editingAppointment, (document.getElementById('new-time-input') as HTMLInputElement).value)}
                                    className="flex-1 h-16 rounded-2xl bg-amber-400 text-slate-900 font-black text-lg hover:bg-amber-500 transition-all shadow-lg shadow-amber-500/10"
                                >
                                    Confirmar Ajuste
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Client Profile Modal */}
            {selectedClient && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in slide-in-from-bottom sm:zoom-in duration-300">
                        {/* Left Side: Client Info */}
                        <div className="w-full md:w-[350px] bg-slate-950 p-10 border-r border-slate-800 flex flex-col items-center">
                            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-900 text-5xl font-black mb-6 shadow-2xl shadow-amber-500/20">
                                {selectedClient.name[0]}
                            </div>
                            <h3 className="text-3xl font-black text-white text-center mb-2 leading-tight uppercase italic tracking-tighter">{selectedClient.name}</h3>
                            <p className="text-amber-400 font-black text-xs uppercase tracking-[0.3em] mb-8">{selectedClient.phone}</p>

                            <div className="w-full space-y-4">
                                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Gasto</p>
                                    <p className="text-2xl font-black text-white">{formatCurrency(appointments.filter(a => a.client_phone === selectedClient.phone && a.status === 'confirmed').reduce((sum, a) => sum + (a.procedure?.price || 0), 0))}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Frequência</p>
                                    <p className="text-2xl font-black text-white">{appointments.filter(a => a.client_phone === selectedClient.phone && a.status === 'confirmed').length} Visitas</p>
                                </div>
                            </div>

                            <a
                                href={`https://wa.me/${selectedClient.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                className="mt-10 w-full h-14 bg-amber-400 text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500 transition-all shadow-lg shadow-amber-500/10"
                            >
                                Chamar no Whats
                            </a>
                            <button
                                onClick={() => setSelectedClient(null)}
                                className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Fechar Perfil
                            </button>
                        </div>

                        {/* Right Side: History & Notes */}
                        <div className="flex-1 p-10 overflow-y-auto">
                            <div className="mb-10">
                                <h4 className="text-xl font-black text-white uppercase italic tracking-widest mb-6 border-b border-slate-800 pb-2">Histórico Técnico</h4>
                                <div className="space-y-4">
                                    {appointments.filter(a => a.client_phone === selectedClient.phone).map(app => (
                                        <div key={app.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center group">
                                            <div>
                                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">{format(new Date(app.start_time), 'dd MMM yyyy', { locale: ptBR })}</p>
                                                <p className="font-bold text-white text-lg">{app.procedure?.name}</p>
                                                <p className="text-slate-500 text-xs font-medium mt-1">Nenhuma nota técnica registrada para este atendimento.</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={cn(
                                                    "px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest",
                                                    app.status === 'confirmed' ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
                                                )}>
                                                    {app.status === 'confirmed' ? 'Realizado' : 'Cancelado'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xl font-black text-white uppercase italic tracking-widest mb-4">Notas Gerais</h4>
                                <textarea
                                    className="w-full h-40 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-slate-300 font-medium placeholder:text-slate-700 focus:ring-2 focus:ring-amber-400/20"
                                    placeholder="Ex: Alérgica a amônia, gosta de café forte, prefere luzes mais frias..."
                                ></textarea>
                                <p className="text-slate-600 text-[10px] font-bold mt-2 uppercase tracking-widest">Anotações salvas automaticamente (em breve)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showManualModal && (
                <ManualAppointmentModal
                    onClose={() => setShowManualModal(false)}
                    onSuccess={() => {
                        setShowManualModal(false);
                        loadData();
                    }}
                />
            )}
            {showProcedureModal && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-xl p-8 sm:p-10 animate-in slide-in-from-bottom sm:zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{editingProcedure ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                            <button onClick={() => setShowProcedureModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            handleSaveProcedure({
                                name: fd.get('name'),
                                category: fd.get('category'),
                                price: parseFloat(fd.get('price') as string),
                                duration_minutes: parseInt(fd.get('duration') as string),
                                description: fd.get('description')
                            });
                        }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Nome</label>
                                    <input name="name" defaultValue={editingProcedure?.name} required className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Categoria</label>
                                    <input name="category" defaultValue={editingProcedure?.category} required list="cats" className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white" />
                                    <datalist id="cats">
                                        <option value="Cabelo" />
                                        <option value="Unhas" />
                                        <option value="Estética" />
                                        <option value="Sobrancelhas" />
                                    </datalist>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Preço (R$)</label>
                                    <input name="price" type="number" step="0.01" defaultValue={editingProcedure?.price} required className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Duração (minutos)</label>
                                    <input name="duration" type="number" defaultValue={editingProcedure?.duration_minutes} required className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Descrição</label>
                                <textarea name="description" defaultValue={editingProcedure?.description} className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button type="submit" className="flex-1 h-14 rounded-2xl bg-amber-400 text-slate-900 font-black">Salvar Alterações</Button>
                                <Button variant="outline" onClick={() => setShowProcedureModal(false)} className="h-14 px-6 rounded-2xl text-slate-400">Cancelar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Monthly Calendar Picker */}
            {showMonthlyPicker && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-md p-8 sm:p-10 animate-in slide-in-from-bottom sm:zoom-in duration-300 shadow-2xl">
                        <div className="flex justify-between items-center mb-10">
                            <button
                                onClick={() => setPickerMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                                className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-amber-400 hover:scale-110 transition-transform"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                                    {format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}
                                </h3>
                            </div>
                            <button
                                onClick={() => setPickerMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                                className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-amber-400 hover:scale-110 transition-transform"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-4">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                                <div key={d} className="text-center text-[10px] font-black text-slate-600 py-2">{d}</div>
                            ))}
                            {(() => {
                                const start = startOfWeek(startOfMonth(pickerMonth), { weekStartsOn: 0 });
                                const end = endOfWeek(endOfMonth(pickerMonth), { weekStartsOn: 0 });
                                const days = [];
                                let current = start;
                                while (current <= end) {
                                    const isCurrentMonth = isSameMonth(current, pickerMonth);
                                    const isSelected = format(current, 'yyyy-MM-dd') === format(agendaDate, 'yyyy-MM-dd');
                                    const isToday = format(current, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                                    const d = current;
                                    days.push(
                                        <button
                                            key={current.toString()}
                                            onClick={() => {
                                                setAgendaDate(d);
                                                setShowMonthlyPicker(false);
                                            }}
                                            className={cn(
                                                "aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative",
                                                !isCurrentMonth ? "text-slate-800 pointer-events-none opacity-20" :
                                                    isSelected ? "bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/20 active:scale-95" :
                                                        "text-white hover:bg-slate-800"
                                            )}
                                        >
                                            {isToday && !isSelected && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full" />}
                                            {format(current, 'd')}
                                        </button>
                                    );
                                    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
                                }
                                return days;
                            })()}
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button
                                onClick={() => {
                                    setAgendaDate(new Date());
                                    setPickerMonth(new Date());
                                    setShowMonthlyPicker(false);
                                }}
                                className="flex-1 h-14 bg-amber-400/10 border border-amber-400/20 text-amber-400 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-amber-400/20 transition-all"
                            >
                                IR PARA HOJE
                            </button>
                            <button
                                onClick={() => setShowMonthlyPicker(false)}
                                className="flex-1 h-14 bg-slate-950 border border-slate-800 text-slate-500 font-bold rounded-2xl text-xs uppercase tracking-widest hover:text-white transition-all"
                            >
                                FECHAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Focus Mode Overlay */}
            {showFocusMode && (
                <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-500">
                    <header className="flex justify-between items-center mb-6 sm:mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-slate-950 shrink-0">
                                <Zap size={20} className="fill-slate-950" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tighter truncate">Modo Atendimento</h2>
                        </div>
                        <button
                            onClick={() => setShowFocusMode(false)}
                            className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 shrink-0"
                        >
                            <X size={24} />
                        </button>
                    </header>

                    <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center">
                        {(() => {
                            const futureApps = appointments
                                .filter(a => a.status === 'confirmed' && new Date(a.start_time) > new Date())
                                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                            const nextApp = futureApps[focusIndex];

                            if (!nextApp) {
                                return (
                                    <div className="space-y-6">
                                        <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto text-slate-600 border border-slate-800">
                                            <Check size={48} />
                                        </div>
                                        <h3 className="text-3xl font-black text-white">Tudo em dia!</h3>
                                        <p className="text-slate-400 text-lg">Você não tem mais atendimentos confirmados.</p>
                                        <Button
                                            onClick={() => {
                                                setShowFocusMode(false);
                                                setFocusIndex(0);
                                            }}
                                            className="mt-8 h-16 px-10 rounded-2xl bg-amber-400 text-slate-900 font-bold"
                                        >
                                            Voltar ao Dashboard
                                        </Button>
                                    </div>
                                );
                            }

                            const hasMore = focusIndex < futureApps.length - 1;
                            const nextPerson = hasMore ? futureApps[focusIndex + 1] : null;

                            return (
                                <div className="w-full space-y-10">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center gap-2 bg-amber-400/10 text-amber-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-amber-400/20">
                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                                            {focusIndex === 0 ? 'Em Atendimento agora' : `Agendado para ${format(new Date(nextApp.start_time), "HH:mm")}`}
                                        </div>
                                        <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter italic leading-none break-words">
                                            {nextApp.client_name.split(' ')[0]}
                                        </h1>
                                        <p className="text-xl sm:text-2xl text-slate-400 font-medium break-words">
                                            {nextApp.procedure?.name}
                                        </p>
                                    </div>

                                    <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 flex flex-col items-center gap-6">
                                        <div className="flex items-center gap-6 sm:gap-8">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Início</span>
                                                <span className="text-3xl sm:text-4xl font-black text-white">{format(new Date(nextApp.start_time), "HH:mm")}</span>
                                            </div>
                                            <div className="w-px h-10 sm:h-12 bg-slate-800"></div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Preço</span>
                                                <span className="text-3xl sm:text-4xl font-black text-amber-400">{formatCurrency(nextApp.procedure?.price || 0)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
                                        <a
                                            href={`https://wa.me/${nextApp.client_phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            className="h-16 sm:h-20 bg-emerald-500 text-white rounded-2xl sm:rounded-[2rem] font-black text-lg sm:text-xl uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all text-center px-4"
                                        >
                                            WhatsApp
                                        </a>
                                        <button
                                            onClick={() => {
                                                updateStatus(nextApp, 'confirmed');
                                                triggerConfetti();
                                                if (hasMore) setFocusIndex(prev => prev + 1);
                                            }}
                                            className="h-16 sm:h-20 bg-amber-400 text-slate-900 rounded-2xl sm:rounded-[2rem] font-black text-lg sm:text-xl uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all text-center px-4"
                                        >
                                            Finalizar
                                        </button>
                                    </div>

                                    {hasMore && (
                                        <button
                                            onClick={() => setFocusIndex(prev => prev + 1)}
                                            className="mt-4 text-slate-500 hover:text-amber-400 font-bold text-xs uppercase tracking-widest transition-all p-4"
                                        >
                                            Ver Próximo: <span className="text-slate-300 ml-1">{nextPerson?.client_name.split(' ')[0]} ({format(new Date(nextPerson?.start_time || ''), "HH:mm")})</span>
                                        </button>
                                    )}

                                    {focusIndex > 0 && (
                                        <button
                                            onClick={() => setFocusIndex(prev => prev - 1)}
                                            className="mt-2 text-slate-700 hover:text-slate-400 font-bold text-[10px] uppercase tracking-widest transition-all"
                                        >
                                            Voltar anterior
                                        </button>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    <footer className="mt-auto pt-10 text-center">
                        <p className="text-slate-600 font-bold uppercase text-[10px] tracking-[0.4em]">Maried Salão • Santos/SP</p>
                    </footer>
                </div>
            )}

            {/* Mobile Bottom Navigation (Instagram Style) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-2xl border-t border-white/5 z-50 px-2 pb-safe flex justify-around items-center h-16">
                <button
                    onClick={() => setView('stats')}
                    className={cn(
                        "flex flex-col items-center justify-center w-full transition-all gap-1",
                        view === 'stats' ? "text-amber-400 scale-105" : "text-slate-500"
                    )}
                >
                    <PieChartIcon size={20} strokeWidth={view === 'stats' ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
                </button>

                <button
                    onClick={() => setView('agenda')}
                    className={cn(
                        "flex flex-col items-center justify-center w-full transition-all gap-1",
                        view === 'agenda' ? "text-amber-400 scale-105" : "text-slate-500"
                    )}
                >
                    <Calendar size={20} strokeWidth={view === 'agenda' ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Agenda</span>
                </button>

                <button
                    onClick={() => setView('requests')}
                    className={cn(
                        "flex flex-col items-center justify-center w-full transition-all gap-1 relative",
                        view === 'requests' ? "text-amber-400 scale-105" : "text-slate-500"
                    )}
                >
                    <div className="relative">
                        <Inbox size={20} strokeWidth={view === 'requests' ? 2.5 : 2} />
                        {appointments.filter(a => a.status === 'pending').length > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-slate-950 text-[8px] font-black rounded-full flex items-center justify-center border border-slate-950">
                                {appointments.filter(a => a.status === 'pending').length}
                            </span>
                        )}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter">Solicitação</span>
                </button>

                <button
                    onClick={() => setView('procedures')}
                    className={cn(
                        "flex flex-col items-center justify-center w-full transition-all gap-1",
                        view === 'procedures' ? "text-amber-400 scale-105" : "text-slate-500"
                    )}
                >
                    <Sparkles size={20} strokeWidth={view === 'procedures' ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Serviços</span>
                </button>

                <button
                    onClick={() => setView('settings')}
                    className={cn(
                        "flex flex-col items-center justify-center w-full transition-all gap-1",
                        view === 'settings' ? "text-amber-400 scale-105" : "text-slate-500"
                    )}
                >
                    <Settings size={20} strokeWidth={view === 'settings' ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Folga</span>
                </button>
            </nav>
        </div>
    );
}
