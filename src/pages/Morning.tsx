import { MorningRoutine } from '@/components/MorningRoutine';
import DailyScorecard from '@/components/yearly-planning/DailyScorecard';
import { Separator } from '@/components/ui/separator';

const Morning = () => {
  return (
    <div className="bg-gradient-to-b from-background to-accent/20 py-6 md:py-8 px-2 md:px-4 pb-24 md:pb-8">
      <div className="container mx-auto space-y-8">
        <MorningRoutine />
        
        <Separator className="my-8" />
        
        {/* Daily Scorecard Section */}
        <div className="max-w-3xl mx-auto">
          <DailyScorecard />
        </div>
      </div>
    </div>
  );
};

export default Morning;
