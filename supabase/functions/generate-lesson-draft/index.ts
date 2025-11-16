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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { logDate } = await req.json();

    // Fetch today's data
    const { data: consistencyLog } = await supabaseClient
      .from('consistency_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', logDate)
      .single();

    const { data: dailyActions } = await supabaseClient
      .from('daily_actions')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', logDate)
      .single();

    // Build context for AI
    const context = {
      morningReflection: consistencyLog?.morning_reflection || 'No morning reflection',
      identityStatement: consistencyLog?.identity_statement || 'I am a consistent man',
      nonNegotiables: [
        consistencyLog?.non_negotiable_1,
        consistencyLog?.non_negotiable_2,
        consistencyLog?.non_negotiable_3
      ].filter(Boolean),
      nonNegotiablesCompleted: consistencyLog?.non_negotiable_completed || [],
      dailyActionsCompleted: dailyActions ? Object.entries(dailyActions)
        .filter(([key, value]) => key.includes('_') && value === true)
        .map(([key]) => key.replace(/_/g, ' ')) : [],
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a thoughtful reflection coach helping someone identify key lessons from their day. 
Based on their morning intentions, completed actions, and non-negotiables, suggest 1-2 sentence lesson learned that's:
- Specific and actionable
- Focuses on what worked or what to improve
- Encouraging but honest
- Written in first person`;

    const userPrompt = `Morning Reflection: ${context.morningReflection}
Identity Statement: ${context.identityStatement}
Non-Negotiables Set: ${context.nonNegotiables.join(', ')}
Non-Negotiables Completed: ${context.nonNegotiablesCompleted.map((c: boolean, i: number) => c ? context.nonNegotiables[i] : `NOT: ${context.nonNegotiables[i]}`).join(', ')}
Daily Actions Completed: ${context.dailyActionsCompleted.join(', ')}

Generate a brief, meaningful lesson learned from this day.`;

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
      throw new Error("Failed to generate lesson draft");
    }

    const data = await response.json();
    const lessonDraft = data.choices[0].message.content;

    return new Response(JSON.stringify({ lessonDraft }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-lesson-draft function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
