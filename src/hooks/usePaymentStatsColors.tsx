import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export interface PaymentStatsColors {
  paidColor: string;
  unpaidColor: string;
  totalColor: string;
}

export const DEFAULT_COLORS: PaymentStatsColors = {
  paidColor: 'text-green-600',
  unpaidColor: 'text-warning',
  totalColor: 'text-primary'
};

export const COLOR_OPTIONS = [
  { name: 'Green', class: 'text-green-600', bgClass: 'bg-green-600' },
  { name: 'Dark Green', class: 'text-green-800', bgClass: 'bg-green-800' },
  { name: 'Blue', class: 'text-blue-600', bgClass: 'bg-blue-600' },
  { name: 'Purple', class: 'text-purple-600', bgClass: 'bg-purple-600' },
  { name: 'Orange', class: 'text-orange-600', bgClass: 'bg-orange-600' },
  { name: 'Red', class: 'text-red-600', bgClass: 'bg-red-600' },
  { name: 'Teal', class: 'text-teal-600', bgClass: 'bg-teal-600' },
  { name: 'Yellow', class: 'text-yellow-600', bgClass: 'bg-yellow-600' },
  { name: 'Black', class: 'text-gray-900', bgClass: 'bg-gray-900' },
];

const getStorageKey = (userId: string) => `payment-stats-colors-${userId}`;

export function usePaymentStatsColors() {
  const { user } = useAuth();
  const [colors, setColors] = useState<PaymentStatsColors>(DEFAULT_COLORS);

  // Load colors from localStorage on mount or when user changes
  useEffect(() => {
    if (!user?.id) {
      setColors(DEFAULT_COLORS);
      return;
    }

    const storageKey = getStorageKey(user.id);
    const savedColors = localStorage.getItem(storageKey);
    
    if (savedColors) {
      try {
        const parsed = JSON.parse(savedColors);
        setColors({
          paidColor: parsed.paidColor || DEFAULT_COLORS.paidColor,
          unpaidColor: parsed.unpaidColor || DEFAULT_COLORS.unpaidColor,
          totalColor: parsed.totalColor || DEFAULT_COLORS.totalColor,
        });
      } catch (error) {
        console.error('Error parsing saved colors:', error);
        setColors(DEFAULT_COLORS);
      }
    } else {
      setColors(DEFAULT_COLORS);
    }
  }, [user?.id]);

  const updateColors = (newColors: PaymentStatsColors) => {
    if (!user?.id) return;
    
    const storageKey = getStorageKey(user.id);
    localStorage.setItem(storageKey, JSON.stringify(newColors));
    setColors(newColors);
  };

  const resetToDefaults = () => {
    if (!user?.id) return;
    
    const storageKey = getStorageKey(user.id);
    localStorage.removeItem(storageKey);
    setColors(DEFAULT_COLORS);
  };

  return {
    colors,
    paidColor: colors.paidColor,
    unpaidColor: colors.unpaidColor,
    totalColor: colors.totalColor,
    updateColors,
    resetToDefaults,
  };
}
