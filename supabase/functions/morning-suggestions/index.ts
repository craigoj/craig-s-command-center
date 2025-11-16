import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating morning suggestions for user:', user.id);

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Fetch yesterday's consistency log
    const { data: yesterdayLog } = await supabaseClient
      .from('consistency_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', yesterdayStr)
      .maybeSingle();

    // Fetch yesterday's daily actions
    const { data: yesterdayActions } = await supabaseClient
      .from('daily_actions')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', yesterdayStr)
      .maybeSingle();

    // Fetch current week's priorities
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const { data: weeklyReset } = await supabaseClient
      .from('weekly_resets')
      .select('week_priorities, pillar_needs_attention')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartStr)
      .maybeSingle();

    // Fetch recent consistency data for context
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: recentLogs } = await supabaseClient
      .from('consistency_logs')
      .select('log_date')
      .eq('user_id', user.id)
      .gte('log_date', sevenDaysAgoStr)
      .order('log_date', { ascending: false });

    const { data: recentActions } = await supabaseClient
      .from('daily_actions')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', sevenDaysAgoStr)
      .order('log_date', { ascending: false });

    // Build context for AI
    const context = {
      yesterday: {
        hadMorningRoutine: !!yesterdayLog,
        morningReflection: yesterdayLog?.morning_reflection || null,
        identityStatement: yesterdayLog?.identity_statement || null,
        nonNegotiables: [
          yesterdayLog?.non_negotiable_1,
          yesterdayLog?.non_negotiable_2,
          yesterdayLog?.non_negotiable_3
        ].filter(Boolean),
        nonNegotiablesCompleted: yesterdayLog?.non_negotiable_completed || [false, false, false],
        visualizationDone: yesterdayLog?.visualization_done || false,
        phoneFree: yesterdayLog?.phone_free_30min || false,
        eveningMood: yesterdayLog?.mood_evening || null,
        lessonLearned: yesterdayLog?.lesson_learned || null,
      },
      yesterdayActions: yesterdayActions ? {
        movement30min: yesterdayActions.movement_30min,
        water64oz: yesterdayActions.water_64oz,
        declutterItem: yesterdayActions.declutter_item,
        thoughtfulText: yesterdayActions.thoughtful_text,
        uncomfortableAction: yesterdayActions.uncomfortable_action,
        keptPromise: yesterdayActions.kept_promise,
        reframedThought: yesterdayActions.reframed_thought,
        confidentPosture: yesterdayActions.confident_posture,
      } : null,
      weeklyContext: {
        priorities: weeklyReset?.week_priorities || [],
        pillarNeedsAttention: weeklyReset?.pillar_needs_attention || null,
      },
      recentStreak: recentLogs?.length || 0,
      recentActionsPattern: recentActions?.map(a => ({
        date: a.log_date,
        completedCount: [
          a.movement_30min,
          a.water_64oz,
          a.declutter_item,
          a.thoughtful_text,
          a.uncomfortable_action,
          a.kept_promise,
          a.reframed_thought,
          a.confident_posture
        ].filter(Boolean).length
      })) || []
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a thoughtful morning coach helping someone optimize their day based on yesterday's performance and weekly goals.

Your task is to analyze their previous day's data and provide:
1. A brief acknowledgment of what went well (wins)
2. Gentle identification of what was missed (without judgment)
3. 3 specific, actionable recommendations for today
4. A motivational focus statement for the day

Keep the tone encouraging, specific, and action-oriented. Focus on progress, not perfection.`;

    const userPrompt = `Analyze this data and provide morning suggestions:

YESTERDAY'S PERFORMANCE:
${context.yesterday.hadMorningRoutine ? `
- Completed morning routine ✓
- Reflection: ${context.yesterday.morningReflection || "None"}
- Non-negotiables set: ${context.yesterday.nonNegotiables.join(', ')}
- Completed: ${context.yesterday.nonNegotiablesCompleted.map((completed: boolean, i: number) => 
  completed ? context.yesterday.nonNegotiables[i] : `NOT: ${context.yesterday.nonNegotiables[i]}`).join(', ')}
- Visualization: ${context.yesterday.visualizationDone ? 'Yes' : 'No'}
- Phone-free time: ${context.yesterday.phoneFree ? 'Yes' : 'No'}
` : '- No morning routine completed'}
${context.yesterday.eveningMood ? `- Evening mood: ${context.yesterday.eveningMood}` : ''}
${context.yesterday.lessonLearned ? `- Lesson learned: ${context.yesterday.lessonLearned}` : ''}

DAILY ACTIONS:
${context.yesterdayActions ? `
- Movement (30min): ${context.yesterdayActions.movement30min ? '✓' : '✗'}
- Water (64oz): ${context.yesterdayActions.water64oz ? '✓' : '✗'}
- Declutter: ${context.yesterdayActions.declutterItem ? '✓' : '✗'}
- Thoughtful text: ${context.yesterdayActions.thoughtfulText ? '✓' : '✗'}
- Uncomfortable action: ${context.yesterdayActions.uncomfortableAction ? '✓' : '✗'}
- Kept promise: ${context.yesterdayActions.keptPromise ? '✓' : '✗'}
- Reframed thought: ${context.yesterdayActions.reframedThought ? '✓' : '✗'}
- Confident posture: ${context.yesterdayActions.confidentPosture ? '✓' : '✗'}
` : '- No daily actions tracked'}

WEEKLY CONTEXT:
${context.weeklyContext.priorities.length > 0 ? `
- This week's priorities: ${context.weeklyContext.priorities.join(', ')}
` : ''}
${context.weeklyContext.pillarNeedsAttention ? `- Focus pillar: ${context.weeklyContext.pillarNeedsAttention}` : ''}
- Current streak: ${context.recentStreak} days

Provide your response in this JSON format:
{
  "wins": ["win1", "win2"],
  "missed": ["item1", "item2"],
  "recommendations": [
    {"action": "specific action", "reason": "why it matters"},
    {"action": "specific action", "reason": "why it matters"},
    {"action": "specific action", "reason": "why it matters"}
  ],
  "focusStatement": "A powerful one-sentence focus for today"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate suggestions");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from the response
    let suggestions;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      suggestions = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      // Fallback to returning the raw content
      suggestions = {
        wins: ["You showed up today"],
        missed: [],
        recommendations: [
          { action: "Complete your morning routine", reason: "Start the day with intention" },
          { action: "Focus on your top priority", reason: "Momentum builds from focused action" },
          { action: "Track your progress", reason: "What gets measured gets improved" }
        ],
        focusStatement: "Today is another opportunity to build consistency."
      };
    }

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in morning-suggestions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
