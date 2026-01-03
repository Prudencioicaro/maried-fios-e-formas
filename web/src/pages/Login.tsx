import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/admin');
        } catch (err: any) {
            setError(err.message || 'Credenciais inválidas. Verifique seu login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse duration-[4000ms]"></div>

            <div className="w-full max-w-[440px] relative z-10">
                {/* Logo Area */}
                <div className="text-center mb-10 animate-in fade-in slide-in-from-top-6 duration-700">
                    <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full"></div>
                        <img
                            src="/logo-fios-e-formas.png"
                            alt="Maried Logo"
                            className="h-32 mx-auto relative z-10 drop-shadow-2xl"
                            onError={(e) => {
                                // Fallback if logo doesn't exist or 404
                                (e.target as HTMLImageElement).src = '/logo-transparent.png';
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-white tracking-tighter italic">
                            GESTÃO <span className="text-amber-400 underline decoration-amber-400/30 underline-offset-8">MARIED</span>
                        </h1>
                        <p className="text-slate-500 font-medium tracking-tight">Acesso exclusivo ao painel administrativo</p>
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] p-8 sm:p-10 border border-white/5 shadow-2xl animate-in zoom-in-95 duration-500">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-xs font-bold border border-red-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">E-mail Profissional</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-950/50 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400/40 transition-all text-slate-200 font-medium placeholder:text-slate-700"
                                        placeholder="admin@maried.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Senha de Acesso</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-950/50 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400/40 transition-all text-slate-200 font-medium placeholder:text-slate-700"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full h-16 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-900 shadow-xl shadow-amber-500/20 text-lg font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:grayscale"
                                isLoading={loading}
                            >
                                ACESSAR PAINEL <ArrowRight size={20} />
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Footer Info */}
                <div className="mt-8 text-center flex items-center justify-center gap-2 text-slate-600 font-medium text-xs animate-in fade-in duration-1000">
                    <Sparkles size={14} className="text-amber-500/50" />
                    <span>Feito com ♡ pelo Icu. V1.0</span>
                </div>
            </div>
        </div>
    );
}
