import React from 'react';
import type { Score } from '../types';

interface ScoreBadgeProps {
  scores: Score;
}

const calculateAverageScore = (scores: Score | undefined): number => {
    if (!scores) return 0;
    const { accuracy, fluency, pronunciation } = scores;
    const avg = (accuracy + fluency + pronunciation) / 3;
    return Math.round(avg * 10) / 10; // Round to one decimal place
};

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ scores }) => {
    const score = calculateAverageScore(scores);
    const getColor = () => {
        if (score >= 4) return 'bg-green-100 text-green-800';
        if (score >= 2.5) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    }
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getColor()}`}>
            {score.toFixed(1)}/5.0
        </span>
    );
};
