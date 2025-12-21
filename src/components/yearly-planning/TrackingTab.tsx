import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  TrendingUp, 
  Calendar
} from 'lucide-react';
import DailyScorecard from './DailyScorecard';
import WeeklyReflection from './WeeklyReflection';

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

        {/* Calendar Audit Placeholder */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Calendar Audit
              </CardTitle>
              <CardDescription>Track where your time goes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-2">Calendar audit feature coming soon</p>
                <p className="text-xs">Growth, Maintenance, or Escape? Know the truth.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
