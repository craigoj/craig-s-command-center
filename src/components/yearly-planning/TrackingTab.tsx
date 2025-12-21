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
    <div className="space-y-6">
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="daily" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Daily</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Weekly</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
        </TabsList>

        {/* Daily Scorecard */}
        <TabsContent value="daily">
          <DailyScorecard />
        </TabsContent>

        {/* Weekly Reflection */}
        <TabsContent value="weekly">
          <WeeklyReflection yearlyPlanId={yearlyPlanId} theme={theme} />
        </TabsContent>

        {/* Calendar Audit */}
        <TabsContent value="calendar">
          <CalendarAudit />
        </TabsContent>
      </Tabs>
    </div>
  );
}
