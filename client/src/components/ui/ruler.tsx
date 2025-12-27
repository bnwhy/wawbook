import React, { useMemo } from 'react';

interface RulerProps {
    sizeMm: number;
    orientation: 'horizontal' | 'vertical';
    step?: number;
}

export const Ruler: React.FC<RulerProps> = ({ sizeMm, orientation, step = 10 }) => {
    // Generate ticks array
    const ticks = useMemo(() => {
        const items = [];
        // Determine max ticks to render to avoid performance issues
        // If ruler is huge, maybe increase step? For now, stick to logic.
        
        for (let i = 0; i <= sizeMm; i += step) {
            const pct = (i / sizeMm) * 100;
            const isMajor = i % 50 === 0;
            
            items.push(
                <div 
                    key={i} 
                    className="absolute bg-gray-400 pointer-events-none"
                    style={{
                        [orientation === 'horizontal' ? 'left' : 'top']: `${pct}%`,
                        [orientation === 'horizontal' ? 'height' : 'width']: isMajor ? '100%' : '35%',
                        [orientation === 'horizontal' ? 'bottom' : 'right']: 0,
                        [orientation === 'horizontal' ? 'width' : 'height']: '1px',
                    }}
                >
                    {isMajor && (
                        <span 
                            className={`absolute text-[9px] font-bold text-slate-500 font-mono tracking-tighter ${
                                orientation === 'horizontal' 
                                    ? 'top-0 left-1' 
                                    : 'right-1 top-0 -translate-y-1/2 rotate-[-90deg] origin-right'
                            }`}
                        >
                            {i}
                        </span>
                    )}
                </div>
            );
        }
        return items;
    }, [sizeMm, orientation, step]);

    return (
        <div className="w-full h-full relative overflow-hidden select-none pointer-events-none">
            {ticks}
        </div>
    );
};
