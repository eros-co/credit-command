'use client';

import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  glow?: 'blue' | 'green' | 'yellow' | 'red';
  valueColor?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  glow,
  valueColor = 'text-foreground',
}: MetricCardProps) {
  const glowClass = glow ? `glow-${glow}` : '';

  return (
    <div className={`card card-hover ${glowClass}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-muted uppercase tracking-wider font-medium">
          {title}
        </span>
        <div className="text-muted">{icon}</div>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {trend && trendValue && (
          <span
            className={`text-xs font-medium ${
              trend === 'up'
                ? 'text-emerald-400'
                : trend === 'down'
                ? 'text-red-400'
                : 'text-muted'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}{' '}
            {trendValue}
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-muted">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
