import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  TrendingUp, 
  Calendar
} from 'lucide-react';
import DailyScorecard from './DailyScorecard';
import WeeklyReflection from './WeeklyReflection';
import CalendarAudit from './CalendarAudit';

interface TrackingTabProps {
  yearlyPlanId?: string;
  theme?: string;
}

export default function TrackingTab({ yearlyPlanId, theme }: TrackingTabProps) {
  const [activeSection, setActiveSection] = useState('daily');

  return (
    <div className="space-y-4 md:space-y-6">
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <div className="overflow-x-auto -mx-3 sm:-mx-0 px-3 sm:px-0 scrollbar-hide">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-3 mb-4 md:mb-6 gap-1">
            <TabsTrigger value="daily" className="gap-1.5 sm:gap-2 min-h-[44px] px-4 sm:px-3 text-sm flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>Daily</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1.5 sm:gap-2 min-h-[44px] px-4 sm:px-3 text-sm flex-shrink-0">
              <TrendingUp className="w-4 h-4" />
              <span>Weekly</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 sm:gap-2 min-h-[44px] px-4 sm:px-3 text-sm flex-shrink-0">
              <Calendar className="w-4 h-4" />
              <span>Calendar</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Daily Scorecard */}
        <TabsContent value="daily" className="mt-0">
          <DailyScorecard />
        </TabsContent>

        {/* Weekly Reflection */}
        <TabsContent value="weekly" className="mt-0">
          <WeeklyReflection yearlyPlanId={yearlyPlanId} theme={theme} />
        </TabsContent>

        {/* Calendar Audit */}
        <TabsContent value="calendar" className="mt-0">
          <CalendarAudit />
        </TabsContent>
      </Tabs>
    </div>
  );
}
