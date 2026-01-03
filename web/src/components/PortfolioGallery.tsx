import { useRef } from 'react';
import { Sparkles } from 'lucide-react';

interface GalleryProps {
    images?: string[];
}

export function PortfolioGallery({ images = [] }: GalleryProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Se não houver imagens, mostramos placeholders premium
    const displayImages = images.length > 0 ? images : [
        'https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=500&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=500&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=500&auto=format&fit=crop',
    ];

    return (
        <div className="relative w-full">
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide px-4 py-2 snap-x snap-mandatory"
            >
                {displayImages.map((src, i) => (
                    <div
                        key={i}
                        className="flex-shrink-0 w-72 h-48 rounded-2xl overflow-hidden shadow-sm border border-slate-100 snap-center bg-slate-200"
                    >
                        <img
                            src={src}
                            alt={`Resultado ${i + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                        />
                    </div>
                ))}

                {/* Card Final de "Ver mais" */}
                <div className="flex-shrink-0 w-40 h-48 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 flex flex-col items-center justify-center text-primary/60 p-4 text-center snap-center">
                    <Sparkles size={24} className="mb-2" />
                    <span className="text-xs font-bold leading-tight">Muitos outros resultados incríveis...</span>
                </div>
            </div>
        </div>
    );
}
