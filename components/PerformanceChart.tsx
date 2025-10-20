import React, { useMemo } from 'react';
import type { PracticeSession } from '../types';
import type { Translations } from '../lib/translations';

interface PerformanceChartProps {
  history: PracticeSession[];
  // FIX: Corrected the type to use 'ja' as it's the only available language.
  t: Translations['ja'];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ history, t }) => {
    const sortedHistory = useMemo(() => 
        [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        [history]
    );

    const width = 500;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 50, left: 40 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const getX = (index: number) => padding.left + (index / (sortedHistory.length - 1)) * chartWidth;
    const getY = (score: number) => padding.top + chartHeight - ((score - 1) / 4) * chartHeight;

    const createPoints = (key: 'accuracy' | 'fluency' | 'pronunciation') => {
        return sortedHistory.map((session, index) => 
            `${getX(index)},${getY(session.scores[key])}`
        ).join(' ');
    };

    const colors = {
        accuracy: '#3b82f6', // blue-500
        fluency: '#22c55e', // green-500
        pronunciation: '#f97316', // orange-500
    };

    return (
        <div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Y-axis grid lines and labels */}
                {[1, 2, 3, 4, 5].map(score => (
                    <g key={score}>
                        <line 
                            x1={padding.left} 
                            y1={getY(score)} 
                            x2={width - padding.right} 
                            y2={getY(score)} 
                            stroke="#e2e8f0" 
                        />
                        <text 
                            x={padding.left - 10} 
                            y={getY(score) + 4} 
                            textAnchor="end" 
                            className="text-xs fill-slate-500">
                            {score}
                        </text>
                    </g>
                ))}
                
                {/* X-axis labels */}
                {sortedHistory.map((session, index) => (
                    <text 
                        key={session.id} 
                        x={getX(index)} 
                        y={height - padding.bottom + 20} 
                        textAnchor="middle" 
                        className="text-xs fill-slate-500">
                        {new Date(session.date).toLocaleDateString()}
                    </text>
                ))}

                {/* Data lines */}
                <polyline
                    fill="none"
                    stroke={colors.accuracy}
                    strokeWidth="2"
                    points={createPoints('accuracy')}
                />
                <polyline
                    fill="none"
                    stroke={colors.fluency}
                    strokeWidth="2"
                    points={createPoints('fluency')}
                />
                <polyline
                    fill="none"
                    stroke={colors.pronunciation}
                    strokeWidth="2"
                    points={createPoints('pronunciation')}
                />
                
                {/* Data points */}
                {sortedHistory.map((session, index) => (
                    <g key={index}>
                        <circle cx={getX(index)} cy={getY(session.scores.accuracy)} r="3" fill={colors.accuracy} />
                        <circle cx={getX(index)} cy={getY(session.scores.fluency)} r="3" fill={colors.fluency} />
                        <circle cx={getX(index)} cy={getY(session.scores.pronunciation)} r="3" fill={colors.pronunciation} />
                    </g>
                ))}
            </svg>
            <div className="flex justify-center items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.accuracy }}></span>
                    <span className="text-slate-600">{t.legendAccuracy}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.fluency }}></span>
                    <span className="text-slate-600">{t.legendFluency}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.pronunciation }}></span>
                    <span className="text-slate-600">{t.legendPronunciation}</span>
                </div>
            </div>
        </div>
    );
};