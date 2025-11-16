import { useTimeOfDay, getGreeting, getTimeBasedEmoji } from "@/hooks/useTimeOfDay";

export function TimeBasedGreeting() {
  const timeOfDay = useTimeOfDay();
  const greeting = getGreeting(timeOfDay);
  const emoji = getTimeBasedEmoji(timeOfDay);

  return (
    <div className="flex items-center gap-2 animate-fade-in">
      <span className="text-2xl">{emoji}</span>
      <div>
        <h2 className="text-lg md:text-xl font-semibold">{greeting}</h2>
        <p className="text-xs md:text-sm text-muted-foreground">
          {timeOfDay === 'morning' && "Let's make today count"}
          {timeOfDay === 'daytime' && "Keep up the momentum"}
          {timeOfDay === 'evening' && "Time to reflect and wind down"}
          {timeOfDay === 'night' && "Rest well, tomorrow is a new day"}
        </p>
      </div>
    </div>
  );
}
