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
    const { taskId, knowledgeItemIds } = await req.json();
    
    // Validate inputs
    if (!taskId || typeof taskId !== 'string') {
      throw new Error('Invalid task ID');
    }
    
    if (!Array.isArray(knowledgeItemIds) || knowledgeItemIds.length === 0) {
      throw new Error('Invalid knowledge item IDs');
    }

    console.log('Generating summary for task:', taskId, 'items:', knowledgeItemIds.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get task details
    const { data: task } = await supabase
      .from('tasks')
      .select('name, description')
      .eq('id', taskId)
      .single();

    // Get knowledge items
    const { data: knowledgeItems } = await supabase
      .from('knowledge_items')
      .select('type, content, url')
      .in('id', knowledgeItemIds);

    if (!knowledgeItems || knowledgeItems.length === 0) {
      throw new Error('No knowledge items found');
    }

    // Build context for AI
    const knowledgeContext = knowledgeItems.map((item, idx) => {
      return `[${idx + 1}] ${item.type.toUpperCase()}: ${item.content}${item.url ? ` (${item.url})` : ''}`;
    }).join('\n\n');

    const systemPrompt = `You are a strategic context synthesizer for CTRL:Craig.

Analyze the provided knowledge items and create a concise, actionable summary for the task.

Focus on:
- Key insights relevant to the task
- Important context or background
- Actionable takeaways
- Any dependencies or blockers mentioned

Keep the summary under 150 words. Be direct and strategic.`;

    const userPrompt = `Task: ${task?.name}
${task?.description ? `Description: ${task.description}` : ''}

Related Knowledge:
${knowledgeContext}

Generate a strategic summary:`;

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
          { role: 'user', content: userPrompt }
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
    const summary = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summarize-knowledge:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});