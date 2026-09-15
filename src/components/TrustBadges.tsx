import { Shield, Lock, Clock, FileCheck, Building2, Heart } from 'lucide-react';

interface TrustBadgeProps {
  variant?: 'default' | 'compact';
}

const badges = [
  { icon: Shield, label: 'Privacy-First' },
  { icon: Lock, label: 'Secure Connection' },
  { icon: Heart, label: 'No Spam Promise' },
  { icon: Clock, label: '60–90 seconds' },
  { icon: FileCheck, label: 'Educational Estimate' },
  { icon: Building2, label: 'Not government-affiliated' },
];

export function TrustBadges({ variant = 'default' }: TrustBadgeProps) {
  const displayBadges = variant === 'compact' ? badges.slice(0, 4) : badges;
  
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {displayBadges.map((badge) => (
        <div
          key={badge.label}
          className="trust-badge"
        >
          <badge.icon className="w-3.5 h-3.5" />
          <span>{badge.label}</span>
        </div>
      ))}
    </div>
  );
}
