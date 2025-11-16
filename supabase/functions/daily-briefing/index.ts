import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating daily briefing');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get top 3 tasks
    const { data: topTasks } = await supabase
      .from('tasks')
      .select(`
        name,
        description,
        priority,
        progress,
        project:projects!inner(name, domain:domains!inner(name, icon))
      `)
      .is('archived_at', null)
      .order('priority', { ascending: true })
      .limit(3);

    // Get recent changes (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('name, created_at')
      .is('archived_at', null)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    // Get stagnant tasks (no step completion in 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: allTasks } = await supabase
      .from('tasks')
      .select(`
        id,
        name,
        priority,
        progress,
        created_at,
        task_steps(is_complete, created_at)
      `)
      .is('archived_at', null)
      .lte('created_at', sevenDaysAgo.toISOString())
      .order('priority', { ascending: true });

    // Find stagnant high-priority tasks
    const stagnantTasks = allTasks?.filter(task => {
      const hasNoProgress = task.progress === 0;
      const hasNoRecentStepCompletion = !task.task_steps?.some((step: any) => 
        step.is_complete && new Date(step.created_at) > sevenDaysAgo
      );
      return task.priority <= 2 && hasNoProgress && hasNoRecentStepCompletion;
    }) || [];

    // Get domain progress
    const { data: domains } = await supabase.from('domains').select('*');
    const domainStats = [];
    
    for (const domain of domains || []) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('domain_id', domain.id);

      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: tasks } = await supabase
          .from('tasks')
          .select('progress')
          .in('project_id', projectIds)
          .is('archived_at', null);

        const avgProgress = tasks && tasks.length > 0
          ? tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length
          : 0;

        domainStats.push({
          name: domain.name,
          icon: domain.icon,
          progress: Math.round(avgProgress)
        });
      }
    }

    // Build context for AI
    const context = {
      topTasks: topTasks?.map((t: any) => ({
        name: t.name,
        priority: t.priority,
        progress: t.progress,
        domain: t.project?.domain?.name || 'Unknown'
      })),
      recentChanges: recentTasks?.length || 0,
      stagnantCount: stagnantTasks.length,
      domainStats
    };

    const systemPrompt = `You are a strategic executive assistant for CTRL:Craig, a personal operating system.

Generate a concise daily briefing with these sections:

1. **Today's Focus** (2-3 sentences about the top tasks)
2. **What Changed** (New tasks, movements, or "Steady state")
3. **Suggested Focus Block** (Recommend time allocation based on task priorities)
4. **Health Reminder** (Brief, actionable - only if health domain needs attention)
5. **One Optimization** (Strategic suggestion to improve effectiveness)

Tone: Direct, strategic, no fluff. Like a trusted Chief of Staff.
Keep total response under 200 words.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate daily briefing:\n${JSON.stringify(context, null, 2)}` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const briefing = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        briefing,
        stagnantTasks: stagnantTasks.map(t => ({
          id: t.id,
          name: t.name,
          priority: t.priority,
          daysSinceCreated: Math.floor((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily-briefing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});