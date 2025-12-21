import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon,
  Plus,
  Loader2,
  TrendingUp,
  Clock,
  Trash2,
  Pencil,
  Leaf,
  Wrench,
  Tv
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, parseISO, differenceInMinutes, isWithinInterval, eachDayOfInterval, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  color_category: string;
  quality_rating: number | null;
  duration_minutes: number | null;
}

interface TimeBlockFormData {
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  colorCategory: 'growth' | 'maintenance' | 'escape';
  qualityRating: number;
  notes: string;
}

const categoryConfig = {
  growth: {
    label: 'Growth',
    emoji: '🟢',
    color: 'bg-green-500',
    textColor: 'text-green-500',
    bgLight: 'bg-green-500/10',
    border: 'border-green-500/30',
    examples: 'Exercise, learning, creating, building'
  },
  maintenance: {
    label: 'Maintenance',
    emoji: '🟡',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    bgLight: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    examples: 'Work meetings, admin, errands'
  },
  escape: {
    label: 'Escape',
    emoji: '🔴',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgLight: 'bg-red-500/10',
    border: 'border-red-500/30',
    examples: 'Mindless scrolling, binge-watching, numbing'
  }
};

const defaultFormData: TimeBlockFormData = {
  title: '',
  date: new Date(),
  startTime: '09:00',
  endTime: '10:00',
  colorCategory: 'maintenance',
  qualityRating: 5,
  notes: ''
};

export default function CalendarAudit() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TimeBlockFormData>(defaultFormData);
  const [dateOpen, setDateOpen] = useState(false);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_date', weekStartStr)
        .lte('start_date', weekEndStr)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateDuration(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return Math.max(0, endMinutes - startMinutes);
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  function parseTimeFromDescription(description: string | null): { start: string; end: string } | null {
    if (!description) return null;
    const match = description.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
    if (match) return { start: match[1], end: match[2] };
    return null;
  }

  async function handleSave() {
    if (!formData.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    if (formData.startTime >= formData.endTime) {
      toast({ title: "End time must be after start time", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const duration = calculateDuration(formData.startTime, formData.endTime);
      const timePrefix = `${formData.startTime}-${formData.endTime}`;
      const description = formData.notes ? `${timePrefix} | ${formData.notes}` : timePrefix;

      const eventData = {
        user_id: user.id,
        title: formData.title.trim(),
        description,
        start_date: format(formData.date, 'yyyy-MM-dd'),
        color_category: formData.colorCategory,
        quality_rating: formData.qualityRating,
        duration_minutes: duration
      };

      if (editingId) {
        const { error } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', editingId);
        if (error) throw error;
        toast({ title: "Time block updated" });
      } else {
        const { error } = await supabase
          .from('calendar_events')
          .insert(eventData);
        if (error) throw error;
        toast({ title: "Time block added" });
      }

      setDialogOpen(false);
      setEditingId(null);
      setFormData(defaultFormData);
      loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({ title: "Error saving", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Time block deleted" });
      loadEvents();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: "Error deleting", variant: "destructive" });
    }
  }

  function openEdit(event: CalendarEvent) {
    const times = parseTimeFromDescription(event.description);
    setFormData({
      title: event.title,
      date: parseISO(event.start_date),
      startTime: times?.start || '09:00',
      endTime: times?.end || '10:00',
      colorCategory: event.color_category as 'growth' | 'maintenance' | 'escape',
      qualityRating: event.quality_rating || 5,
      notes: event.description?.replace(/^\d{2}:\d{2}-\d{2}:\d{2}\s*\|\s*/, '') || ''
    });
    setEditingId(event.id);
    setDialogOpen(true);
  }

  function openNew() {
    setFormData(defaultFormData);
    setEditingId(null);
    setDialogOpen(true);
  }

  // Calculate weekly stats
  const stats = events.reduce((acc, event) => {
    const duration = event.duration_minutes || 0;
    acc.total += duration;
    acc[event.color_category] = (acc[event.color_category] || 0) + duration;
    if (event.quality_rating !== null) {
      acc.qualitySum += event.quality_rating;
      acc.qualityCount++;
    }
    return acc;
  }, { total: 0, growth: 0, maintenance: 0, escape: 0, qualitySum: 0, qualityCount: 0 } as Record<string, number>);

  const avgQuality = stats.qualityCount > 0 ? (stats.qualitySum / stats.qualityCount).toFixed(1) : '-';

  // Group events by day
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const eventsByDay = daysOfWeek.map(day => ({
    date: day,
    events: events.filter(e => isSameDay(parseISO(e.start_date), day))
  })).filter(d => d.events.length > 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="px-4 md:px-6 pb-3 md:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                Calendar Audit
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew} className="gap-2 w-full sm:w-auto min-h-[44px]">
                  <Plus className="w-4 h-4" />
                  Add Block
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit' : 'Add'} Time Block</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label className="text-sm">Activity Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Deep work session"
                      className="text-base min-h-[44px]"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label className="text-sm">Date</Label>
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start min-h-[44px]">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {format(formData.date, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => {
                            if (date) {
                              setFormData(prev => ({ ...prev, date }));
                              setDateOpen(false);
                            }
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Start</Label>
                      <Input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">End</Label>
                      <Input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Category - Touch optimized */}
                  <div className="space-y-2">
                    <Label className="text-sm">Category *</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map((key) => {
                        const cat = categoryConfig[key];
                        const isSelected = formData.colorCategory === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, colorCategory: key }))}
                            className={cn(
                              "p-3 rounded-lg border-2 text-center transition-all min-h-[72px]",
                              isSelected ? `${cat.bgLight} ${cat.border}` : "border-border hover:border-muted-foreground/50"
                            )}
                          >
                            <span className="text-xl block mb-1">{cat.emoji}</span>
                            <span className={cn("text-xs font-medium", isSelected && cat.textColor)}>
                              {cat.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quality Rating */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">Quality</Label>
                      <span className="text-sm font-medium">{formData.qualityRating}/10</span>
                    </div>
                    <Slider
                      value={[formData.qualityRating]}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, qualityRating: v[0] }))}
                      max={10}
                      step={1}
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-sm">Notes (optional)</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Reflections..."
                      rows={2}
                      className="text-base"
                    />
                  </div>

                  <Button onClick={handleSave} disabled={saving} className="w-full min-h-[48px]">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingId ? 'Update' : 'Add'} Time Block
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Weekly Summary */}
      {events.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Breakdown */}
            <div className="space-y-3">
              {(['growth', 'maintenance', 'escape'] as const).map((cat) => {
                const config = categoryConfig[cat];
                const minutes = stats[cat] || 0;
                const percentage = stats.total > 0 ? Math.round((minutes / stats.total) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span>{config.emoji}</span>
                        <span className={config.textColor}>{config.label}</span>
                      </span>
                      <span className="text-muted-foreground">
                        {percentage}% ({formatDuration(minutes)})
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", config.color)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats Row */}
            <div className="flex justify-around pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{formatDuration(stats.total)}</div>
                <div className="text-xs text-muted-foreground">Total Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{avgQuality}</div>
                <div className="text-xs text-muted-foreground">Avg Quality</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{events.length}</div>
                <div className="text-xs text-muted-foreground">Time Blocks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events by Day */}
      {eventsByDay.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground mb-2">No time blocks logged this week</p>
            <p className="text-sm text-muted-foreground mb-4">
              Start tracking where your time goes
            </p>
            <Button variant="outline" onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Block
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {eventsByDay.map(({ date, events: dayEvents }) => (
            <Card key={date.toISOString()}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium">
                  {format(date, 'EEEE, MMM d')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-4">
                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const config = categoryConfig[event.color_category as keyof typeof categoryConfig];
                    const times = parseTimeFromDescription(event.description);
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          config?.bgLight,
                          config?.border
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg">{config?.emoji}</span>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{event.title}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              {times && <span>{times.start}-{times.end}</span>}
                              {event.duration_minutes && (
                                <span className="text-xs">({formatDuration(event.duration_minutes)})</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.quality_rating !== null && (
                            <Badge variant="secondary" className="text-xs">
                              {event.quality_rating}/10
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(event)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Legend */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map((key) => {
              const cat = categoryConfig[key];
              return (
                <div key={key}>
                  <span className="text-lg block">{cat.emoji}</span>
                  <span className={cn("font-medium", cat.textColor)}>{cat.label}</span>
                  <p className="text-xs text-muted-foreground mt-1">{cat.examples}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
