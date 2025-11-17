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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        name,
        priority,
        progress,
        created_at,
        task_steps(is_complete, created_at)
      `)
      .lte('created_at', sevenDaysAgo.toISOString())
      .order('priority', { ascending: true });

    if (error) {
      throw error;
    }

    const stagnantTasks = (allTasks || []).filter(task => {
      const hasNoProgress = task.progress === 0;
      const hasNoRecentStepCompletion = !(task.task_steps || []).some((step: any) =>
        step.is_complete && new Date(step.created_at) > sevenDaysAgo
      );

      return task.priority <= 2 && hasNoProgress && hasNoRecentStepCompletion;
    }).map(task => ({
      id: task.id,
      name: task.name,
      priority: task.priority,
      daysSinceCreated: Math.floor((Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24))
    }));

    return new Response(
      JSON.stringify({ stagnantTasks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in stagnant-tasks function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
