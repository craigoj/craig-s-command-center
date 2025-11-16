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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Calculating momentum score for user:', user.id);

    // Get last 7 days of data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Completed tasks in last 7 days
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user.id)
      .eq('progress', 100)
      .is('archived_at', null)
      .gte('created_at', sevenDaysAgo.toISOString());

    // Completed steps in last 7 days
    const { data: completedSteps } = await supabase
      .from('task_steps')
      .select('id, task_id')
      .eq('is_complete', true)
      .gte('created_at', sevenDaysAgo.toISOString());
    
    // Filter steps to only include those from user's tasks
    const userCompletedSteps = completedSteps?.filter(step => 
      completedTasks?.some(task => task.id === step.task_id)
    ) || [];

    // Open or stagnant tasks
    const { data: openTasks } = await supabase
      .from('tasks')
      .select('id, progress')
      .eq('user_id', user.id)
      .lt('progress', 100)
      .is('archived_at', null);

    const stagnantTasks = openTasks?.filter(t => t.progress === 0) || [];

    // Calculate momentum
    const completedTasksCount = completedTasks?.length || 0;
    const completedStepsCount = userCompletedSteps.length;
    const openTasksCount = openTasks?.length || 1; // Avoid division by zero
    const stagnantCount = stagnantTasks.length;

    // Momentum formula: (completed items) / (open + stagnant items)
    const momentumRaw = (completedTasksCount + completedStepsCount) / (openTasksCount + stagnantCount);
    
    // Convert to 0-100 scale with some curve adjustment
    const momentumScore = Math.min(100, Math.round(momentumRaw * 50));

    // Determine percentile and label
    let percentile = 0;
    let label = 'Starting';
    let emoji = '🌱';
    
    if (momentumScore >= 80) {
      percentile = 95;
      label = 'High';
      emoji = '🔥';
    } else if (momentumScore >= 60) {
      percentile = 75;
      label = 'Strong';
      emoji = '⚡';
    } else if (momentumScore >= 40) {
      percentile = 50;
      label = 'Steady';
      emoji = '📈';
    } else if (momentumScore >= 20) {
      percentile = 25;
      label = 'Building';
      emoji = '🌿';
    }

    return new Response(
      JSON.stringify({
        score: momentumScore,
        percentile,
        label,
        emoji,
        stats: {
          completedTasks: completedTasksCount,
          completedSteps: completedStepsCount,
          openTasks: openTasksCount,
          stagnantTasks: stagnantCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in momentum-score:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});