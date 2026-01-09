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
    const { input } = await req.json();
    console.log('Classifying input:', input);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get all domains and projects for context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: domains } = await supabase.from('domains').select('*');
    const { data: projects } = await supabase.from('projects').select('*');

    const systemPrompt = `You are an AI assistant for CTRL:Craig, a personal operating system for Craig.

CONTEXT ABOUT USER:
- Works at University of Michigan on workflow automation (TeamDynamix, OCR projects)
- Runs YouTube channel @Craigo_J focused on productivity and tech
- Owns custom suit business
- Training for HYROX competition
- Multiple tech ventures: 937tech.com, ctrltechhq.com
- Uses domains: ${domains?.map(d => d.name).join(', ') || 'SSC, Startups, Skills, Health'}
- Active projects: ${projects?.map(p => p.name).join(', ') || 'None'}

PATTERN RECOGNITION:
- TeamDynamix/OCR/university/automation = work context (SSC domain)
- YouTube/video/content/filming = content category
- Training/HYROX/gym/weights/running = health category
- Business/startup/venture/client = Startups domain
- Learning/insight/discovered/realized = learning category
- Person names, "met with", "follow up with" = person category

CLASSIFICATION CATEGORIES:
1. "task" - Actionable item with clear deliverable (do X, finish Y, send Z)
2. "project" - Larger initiative spanning multiple tasks (build X, launch Y)
3. "person" - Reference to someone, relationship note, follow-up needed
4. "learning" - Insight, discovery, lesson, or knowledge to remember
5. "health" - Training log, nutrition note, health metric, peptide protocol
6. "content" - Video idea, blog topic, social post concept
7. "question" - Asking for information or clarification

DECISION RULES:
- Be decisive - pick the best category even if only 70% confident
- Set confidence < 0.7 only when truly ambiguous between categories
- Default to "task" if it's actionable but unclear which category
- Extract all relevant metrics from health entries (weights, times, distances)
- Infer priority for tasks: "urgent", "ASAP", "today" = high; no indicator = medium; "sometime", "eventually" = low

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "category": "task" | "project" | "person" | "learning" | "health" | "content" | "question",
  "confidence": 0.95,
  "title": "concise descriptive title",
  "extracted_data": { /* category-specific fields */ }
}

EXTRACTED DATA BY CATEGORY:

For "person":
{
  "name": "person's full name",
  "context": "how user knows them / their role",
  "follow_up": "specific action needed or null",
  "tags": ["client" | "collaborator" | "competitor" | "personal" | "university"]
}

For "learning":
{
  "title": "insight title",
  "category": "AI" | "Automation" | "Business" | "Health" | "Tech",
  "key_insight": "one-sentence takeaway",
  "application": "how to use this insight",
  "source": "where it came from or null"
}

For "health":
{
  "type": "Training" | "Nutrition" | "Peptides" | "Recovery",
  "details": "what happened",
  "metrics": { "weights": [], "times": [], "distances": [], "reps": [], "other": {} },
  "reflection": "how it felt or null"
}

For "content":
{
  "title": "content title",
  "type": "Video" | "Blog" | "Social",
  "topic": "main theme",
  "audience": "target viewer",
  "notes": "research ideas or talking points"
}

For "task":
{
  "task_name": "clear actionable task name",
  "suggested_domain": "SSC" | "Startups" | "Skills" | "Health",
  "suggested_project": "existing project name or null",
  "priority": "high" | "medium" | "low",
  "due_date": "YYYY-MM-DD if mentioned, else null",
  "description": "brief context"
}

For "project":
{
  "project_name": "clear project name",
  "domain": "SSC" | "Startups" | "Skills" | "Health",
  "status": "Active" | "Planning",
  "next_action": "first executable step",
  "description": "project overview"
}

For "question":
{
  "topic": "what the question is about",
  "context": "relevant background",
  "response": "helpful answer or guidance"
}`;

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
          { role: 'user', content: input }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    console.log('AI response:', aiResponse);

    // Parse JSON response
    let classification;
    try {
      // Remove markdown code blocks if present
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      classification = JSON.parse(cleanResponse);
      
      // Validate required fields
      if (!classification.category || !classification.title) {
        throw new Error('Missing required fields');
      }
      
      // Ensure confidence is a number between 0 and 1
      if (typeof classification.confidence !== 'number') {
        classification.confidence = 0.8;
      }
      classification.confidence = Math.max(0, Math.min(1, classification.confidence));
      
      // Validate category
      const validCategories = ['task', 'project', 'person', 'learning', 'health', 'content', 'question'];
      if (!validCategories.includes(classification.category)) {
        classification.category = 'task';
        classification.confidence = 0.5;
      }
      
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse, e);
      // Fallback: treat as question with low confidence
      classification = {
        category: 'question',
        confidence: 0.5,
        title: input.substring(0, 50) + (input.length > 50 ? '...' : ''),
        extracted_data: {
          topic: 'unclear',
          context: input,
          response: 'I had trouble classifying this. Could you rephrase or provide more context?'
        }
      };
    }

    console.log('Final classification:', classification);

    return new Response(
      JSON.stringify(classification),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in classify-input:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
