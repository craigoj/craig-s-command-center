import { useState, useEffect } from 'react';

export type TimeOfDay = 'morning' | 'daytime' | 'evening' | 'night';

export function useTimeOfDay() {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('daytime');

  useEffect(() => {
    const updateTimeOfDay = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 11) {
        setTimeOfDay('morning');
      } else if (hour >= 11 && hour < 17) {
        setTimeOfDay('daytime');
      } else if (hour >= 17 && hour < 22) {
        setTimeOfDay('evening');
      } else {
        setTimeOfDay('night');
      }
    };

    updateTimeOfDay();
    
    // Update every minute
    const interval = setInterval(updateTimeOfDay, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return timeOfDay;
}

export function getGreeting(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning':
      return 'Good Morning';
    case 'daytime':
      return 'Good Afternoon';
    case 'evening':
      return 'Good Evening';
    case 'night':
      return 'Good Night';
  }
}

export function getTimeBasedEmoji(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning':
      return '☀️';
    case 'daytime':
      return '🌤️';
    case 'evening':
      return '🌅';
    case 'night':
      return '🌙';
  }
}
