import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
}: StatCardProps) {
  return (
    <div
      className="
        group
        flex
        gap-4
        rounded-lg
        border
        border-border
        bg-card
        p-5

        transition-all
        duration-200

        hover:-translate-y-1
        hover:border-primary/40
        hover:shadow-lg
        hover:shadow-black/20
      "
    >
      {/* Icon */}
      <div
        className={`
          flex
          h-12
          w-12
          shrink-0
          items-center
          justify-center
          rounded-lg
          ${iconBg}

          transition-transform
          duration-200

          group-hover:scale-105
        `}
      >
        <Icon
          size={22}
          className={`
            ${iconColor}
            transition-transform
            duration-200
          `}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">

        {/* Title */}
        <p
          className="
            truncate
            text-sm
            font-medium
            text-muted-foreground
          "
        >
          {title}
        </p>

        {/* Value */}
        <p
          className="
            mt-0.5
            font-mono
            text-2xl
            font-bold
            leading-tight
            text-foreground
          "
        >
          {value}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p
            className="
              mt-1
              text-xs
              text-muted-foreground
            "
          >
            {subtitle}
          </p>
        )}

        {/* Trend */}
        {trend && (
          <span
            className={`
              mt-1
              inline-flex
              items-center
              gap-1
              text-xs
              font-medium

              ${
                trend.positive
                  ? 'text-primary'
                  : 'text-red-400'
              }
            `}
          >
            {trend.positive ? '↑' : '↓'} {trend.value} vs kemarin
          </span>
        )}

      </div>
    </div>
  );
}