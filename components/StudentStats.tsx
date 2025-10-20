import React, { useMemo } from 'react';
import type { PracticeSession, Score } from '../types';
import type { Translations } from '../lib/translations';

interface StudentStatsProps {
  history: PracticeSession[];
  // FIX: Corrected the type to use 'ja' as it's the only available language.
  t: Translations['ja'];
}

const BarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const maxValue = 5;
    const barColor = "text-blue-500";
    const labelColor = "text-slate-500";
    const valueColor = "text-slate-700";

    return (
        <div className="space-y-3 pt-2">
            {data.map(item => (
                <div key={item.label}>
                    <div className="flex justify-between items-center text-sm mb-1">
                        <span className={`font-medium ${labelColor}`}>{item.label}</span>
                        <span className={`font-semibold ${valueColor}`}>{item.value.toFixed(1)} / 5.0</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className={`bg-blue-600 h-2.5 rounded-full`} style={{ width: `${(item.value / maxValue) * 100}%` }}></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const StudentStats: React.FC<StudentStatsProps> = ({ history, t }) => {
  const stats = useMemo(() => {
    if (history.length === 0) {
      return {
        totalSessions: 0,
        averageScores: { accuracy: 0, fluency: 0, pronunciation: 0 },
      };
    }

    const totalScores = history.reduce(
      (acc, session) => {
        acc.accuracy += session.scores.accuracy;
        acc.fluency += session.scores.fluency;
        acc.pronunciation += session.scores.pronunciation;
        return acc;
      },
      { accuracy: 0, fluency: 0, pronunciation: 0 }
    );

    return {
      totalSessions: history.length,
      averageScores: {
        accuracy: totalScores.accuracy / history.length,
        fluency: totalScores.fluency / history.length,
        pronunciation: totalScores.pronunciation / history.length,
      },
    };
  }, [history]);

  const chartData = (Object.keys(t.scores) as Array<keyof Score>).map(key => ({
      label: t.scores[key],
      value: stats.averageScores[key]
  }));

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-slate-700 mb-1 border-b pb-2">{t.studentStatsTitle}</h3>
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-slate-600">{t.totalSessions}</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalSessions}</p>
        </div>
        <div className="mt-4">
            <p className="text-sm font-medium text-slate-600 mb-2">{t.averageScores}</p>
            <BarChart data={chartData} />
        </div>
      </div>
    </div>
  );
};