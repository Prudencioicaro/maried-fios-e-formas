import { useNavigate } from 'react-router-dom';
import { ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useEffect, useRef, useState } from 'react';

const PROCEDURES_CAROUSEL = [
    'Mechas', 'Corte Feminino', 'Escova Progressiva', 'Coloração',
    'Hidratação Profunda', 'Penteados', 'Manicure', 'Pedicure',
    'Design de Sobrancelhas', 'Depilação', 'Limpeza de Pele'
];

const CATEGORIES = [
    {
        id: 'corte-tratamentos',
        name: 'Corte & Tratamentos',
        description: 'Hidratação, Nutrição, Reconstrução e Cortes',
        category: 'Corte e Tratamentos',
        minPrice: 100,
        image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
        gradient: 'from-amber-500/20 to-transparent'
    },
    {
        id: 'coloracao',
        name: 'Coloração',
        description: 'Raiz, cobertura de brancos e gloss',
        category: 'Coloração',
        minPrice: 150,
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
        gradient: 'from-rose-500/20 to-transparent'
    },
    {
        id: 'mechas',
        name: 'Mechas',
        description: 'Luzes, reflexos e esfumaçamento',
        category: 'Mechas',
        minPrice: 350,
        image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80',
        gradient: 'from-yellow-500/20 to-transparent'
    },
    {
        id: 'botox',
        name: 'Botox',
        description: 'Redução de volume e alinhamento',
        category: 'Botox',
        minPrice: 150,
        image: '/botox-treatment.png',
        gradient: 'from-purple-500/20 to-transparent'
    },
    {
        id: 'selagem',
        name: 'Selagem',
        description: 'Alisamento e brilho intenso',
        category: 'Selagem',
        minPrice: 200,
        image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&q=80',
        gradient: 'from-emerald-500/20 to-transparent'
    },
    {
        id: 'penteados',
        name: 'Penteados',
        description: 'Festas, escovas e babyliss',
        category: 'Penteado',
        minPrice: 70,
        image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80',
        gradient: 'from-pink-500/20 to-transparent'
    },
    {
        id: 'escova',
        name: 'Escova',
        description: 'Escovas modeladas para todos os comprimentos',
        category: 'Escova',
        minPrice: 60,
        image: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=800&q=80',
        gradient: 'from-sky-500/20 to-transparent'
    }
];

export default function Home() {
    const navigate = useNavigate();
    const servicesRef = useRef<HTMLElement>(null);
    const [cardsVisible, setCardsVisible] = useState(false);
    const [parallaxOffset, setParallaxOffset] = useState(0);

    const scrollToServices = () => {
        servicesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Parallax effect for hero image
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const heroHeight = window.innerHeight;

            // Only apply parallax while in hero section
            if (scrollY < heroHeight) {
                setParallaxOffset(scrollY * 0.5);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Intersection Observer for card animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setCardsVisible(true);
                    }
                });
            },
            { threshold: 0.1 }
        );

        if (servicesRef.current) {
            observer.observe(servicesRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 relative">
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

            {/* HERO SECTION */}
            <section className="relative h-screen w-full overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `
                            linear-gradient(to right, #475569 1px, transparent 1px),
                            linear-gradient(to bottom, #475569 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px'
                    }}></div>
                </div>

                {/* Background Image with Gradient Overlay and Parallax */}
                <div className="absolute inset-0">
                    {/* Top to middle gradient - dark */}
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-transparent z-10"></div>
                    {/* Bottom gradient - dark to light transition */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950 z-10"></div>
                    <img
                        src="/maried-hero.jpg"
                        alt="Maried - Profissional de Beleza"
                        className="w-full h-full object-cover object-center opacity-60"
                        style={{
                            transform: `translateY(${parallaxOffset}px)`,
                            willChange: 'transform'
                        }}
                    />
                </div>

                {/* Logo - Centered on mobile, left on desktop */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0 z-20">
                    <img
                        src="/logo-full.png"
                        alt="Maried - Fios e Formas"
                        className="h-20 w-auto drop-shadow-2xl brightness-110 contrast-125"
                        style={{ filter: 'drop-shadow(0 0 20px rgba(232, 220, 196, 0.4))' }}
                    />
                </div>



                {/* Hero Content - Centered vertically on tall screens */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 md:px-8 text-center">
                    <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-tight tracking-tight px-4">
                            Transforme
                            <span className="block bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent mt-2" style={{
                                textShadow: 'none'
                            }}>
                                Seu Cabelo
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-200 font-light max-w-xl mx-auto px-4" style={{
                            textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,1)'
                        }}>
                            Cortes, coloração e tratamentos capilares em Santos
                        </p>
                        <div className="pt-6">
                            <Button
                                size="lg"
                                onClick={scrollToServices}
                                className="h-16 px-12 text-lg font-black rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-900 shadow-2xl shadow-amber-500/30 border-none transition-all hover:scale-105"
                            >
                                <Sparkles className="mr-2" size={24} />
                                Agendar Horário
                            </Button>
                        </div>
                    </div>

                    {/* Sophisticated Scroll Indicator */}
                    <div className="absolute bottom-16 md:bottom-12 left-1/2 -translate-x-1/2">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-6 h-10 rounded-full border-2 border-amber-300/40 flex items-start justify-center p-2">
                                <div className="w-1.5 h-3 bg-amber-300 rounded-full animate-scroll-down"></div>
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/60">
                                Deslize
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* INFINITE CAROUSEL - Procedures (faster animation) */}
            <div className="relative bg-slate-900 py-6 overflow-hidden border-y border-slate-800">
                <div className="flex gap-8 animate-scroll-fast whitespace-nowrap">
                    {[...PROCEDURES_CAROUSEL, ...PROCEDURES_CAROUSEL, ...PROCEDURES_CAROUSEL].map((proc, idx) => (
                        <span
                            key={idx}
                            className="text-2xl font-black text-transparent bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text uppercase tracking-wider"
                        >
                            {proc} •
                        </span>
                    ))}
                </div>
            </div>

            {/* SERVICES SECTION */}
            <section ref={servicesRef} className="relative py-24 px-6 bg-slate-950">
                {/* Subtle Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, #E8DCC4 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}></div>
                </div>

                <div className="relative max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight">
                            Nossos Serviços
                        </h2>
                        <p className="text-xl text-slate-400 font-light max-w-2xl mx-auto">
                            Escolha a categoria e descubra todos os procedimentos disponíveis
                        </p>
                    </div>

                    {/* Category Cards with animation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6">
                        {CATEGORIES.map((category, index) => (
                            <button
                                key={category.id}
                                onClick={() => navigate(`/agendar/${category.id}`)}
                                className={`group relative h-80 rounded-3xl overflow-hidden shadow-2xl hover:shadow-amber-500/30 transition-all duration-500 hover:-translate-y-2 ${cardsVisible
                                    ? 'animate-in fade-in slide-in-from-bottom-8'
                                    : 'opacity-0'
                                    }`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Background Image */}
                                <img
                                    src={category.image}
                                    alt={category.name}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    loading="lazy"
                                />

                                {/* Stronger Gradient Overlay for better readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent"></div>
                                <div className={`absolute inset-0 bg-gradient-to-t ${category.gradient} to-transparent opacity-40`}></div>

                                {/* Content */}
                                <div className="relative h-full flex flex-col justify-end p-6 text-left">
                                    <h3 className="text-3xl font-black text-white mb-2 tracking-tight">
                                        {category.name}
                                    </h3>
                                    <p className="text-white/80 text-sm font-medium mb-3 line-clamp-2">
                                        {category.description}
                                    </p>
                                    <div className="text-amber-300 font-black text-lg mb-3">
                                        A partir de R$ {category.minPrice}
                                    </div>
                                    <div className="inline-flex items-center text-amber-300 font-bold text-sm group-hover:gap-2 gap-1 transition-all">
                                        Ver procedimentos
                                        <ChevronDown className="rotate-[-90deg]" size={18} />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-slate-900 text-white py-16 px-6 border-t border-slate-800 relative z-10">
                <div className="max-w-7xl mx-auto">
                    {/* Logo with Strong Glow */}
                    <div className="text-center mb-12">
                        <img
                            src="/logo-full.png"
                            alt="Maried - Fios e Formas"
                            className="h-20 w-auto mx-auto brightness-110 contrast-125"
                            style={{
                                filter: 'drop-shadow(0 0 30px rgba(232, 220, 196, 0.6)) drop-shadow(0 0 15px rgba(232, 220, 196, 0.4))'
                            }}
                        />
                    </div>

                    {/* 3 Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                        {/* Column 1: Contact */}
                        <div className="text-center md:text-left">
                            <h3 className="text-amber-300 font-black text-lg uppercase tracking-wider mb-4">
                                Contato
                            </h3>
                            <div className="space-y-3 text-slate-300">
                                <p className="flex items-center justify-center md:justify-start gap-2">
                                    <span className="text-amber-400">📍</span>
                                    <span className="text-sm">Santos, SP</span>
                                </p>
                                <p className="flex items-center justify-center md:justify-start gap-2">
                                    <span className="text-amber-400">📱</span>
                                    <a href="https://wa.me/5513997531418" className="text-sm hover:text-amber-300 transition-colors">
                                        (13) 99753-1418
                                    </a>
                                </p>
                            </div>
                        </div>

                        {/* Column 2: Hours */}
                        <div className="text-center">
                            <h3 className="text-amber-300 font-black text-lg uppercase tracking-wider mb-4">
                                Horários
                            </h3>
                            <div className="space-y-2 text-slate-300 text-sm">
                                <p className="font-semibold text-white">Terça a Sábado</p>
                                <p>9h às 18h</p>
                                <p className="text-slate-500 mt-3">Domingo e Segunda</p>
                                <p className="text-slate-500">Fechado</p>
                            </div>
                        </div>

                        {/* Column 3: Social Media */}
                        <div className="text-center md:text-right">
                            <h3 className="text-amber-300 font-black text-lg uppercase tracking-wider mb-4">
                                Redes Sociais
                            </h3>
                            <div className="flex items-center justify-center md:justify-end gap-4">
                                <a
                                    href="https://www.instagram.com/marihairoficial?igsh=dnJnY3dhdXRrNWp6"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                                    aria-label="Instagram"
                                >
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://wa.me/5513997531418"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                                    aria-label="WhatsApp"
                                >
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="text-center pt-8 border-t border-slate-800">
                        <p className="text-slate-400 text-sm">
                            © 2026 Maried - Fios e Formas. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </footer>

            {/* CSS for Animations */}
            <style>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.333%); }
                }
                .animate-scroll-fast {
                    animation: scroll 15s linear infinite;
                }
                @keyframes scroll-down {
                    0% { transform: translateY(0); opacity: 0; }
                    40% { opacity: 1; }
                    80% { transform: translateY(16px); opacity: 0; }
                    100% { transform: translateY(16px); opacity: 0; }
                }
                .animate-scroll-down {
                    animation: scroll-down 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
