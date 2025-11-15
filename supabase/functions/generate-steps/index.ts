import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskName, taskDescription } = await req.json();
    console.log('Generating steps for:', taskName);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a strategic execution assistant. Break down tasks into clear, actionable steps.

Rules:
- Return 3-7 steps maximum
- Each step should be specific and actionable
- Order steps logically
- Keep steps concise (one line each)
- Focus on high-leverage actions

Return ONLY a JSON array of step strings, no markdown:
["Step 1", "Step 2", "Step 3"]`;

    const userPrompt = `Task: ${taskName}
${taskDescription ? `Description: ${taskDescription}` : ''}

Generate execution steps:`;

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
    const aiResponse = data.choices[0].message.content;
    console.log('AI response:', aiResponse);

    // Parse JSON response
    let steps;
    try {
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      steps = JSON.parse(cleanResponse);
      
      // Ensure it's an array
      if (!Array.isArray(steps)) {
        throw new Error('Response is not an array');
      }
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse);
      // Fallback: split by newlines
      steps = aiResponse
        .split('\n')
        .filter((line: string) => line.trim() && !line.startsWith('```'))
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim());
    }

    return new Response(
      JSON.stringify({ steps }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-steps:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});