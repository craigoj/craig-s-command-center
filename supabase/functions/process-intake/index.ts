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
    const { intakeItemId, action, modifications } = await req.json();
    
    // Validate inputs
    if (!intakeItemId || typeof intakeItemId !== 'string') {
      throw new Error('Invalid intake item ID');
    }
    
    if (!['accept', 'modify', 'discard'].includes(action)) {
      throw new Error('Invalid action');
    }

    console.log('Processing intake item:', intakeItemId, 'Action:', action);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the intake item
    const { data: intakeItem, error: fetchError } = await supabase
      .from('intake_items')
      .select('*')
      .eq('id', intakeItemId)
      .single();

    if (fetchError || !intakeItem) {
      throw new Error('Intake item not found');
    }

    if (action === 'discard') {
      // Delete the intake item
      await supabase
        .from('intake_items')
        .delete()
        .eq('id', intakeItemId);

      return new Response(
        JSON.stringify({ success: true, action: 'discarded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For accept or modify, we need to classify the item
    let textToClassify = intakeItem.raw_text;
    
    if (action === 'modify' && modifications) {
      // Validate modifications
      if (modifications.raw_text && typeof modifications.raw_text === 'string') {
        textToClassify = modifications.raw_text.trim().slice(0, 5000); // Max 5000 chars
      }
    }

    // Get all domains and projects for context
    const { data: domains } = await supabase.from('domains').select('*');
    const { data: projects } = await supabase.from('projects').select('*');

    const systemPrompt = `You are an AI assistant for CTRL:Craig. Classify and extract structured information from user input.

Available domains: ${domains?.map(d => d.name).join(', ')}
Existing projects: ${projects?.map(p => p.name).join(', ')}

Classify the input as:
1. "task" - User wants to add a task
2. "note" - General note or information to store
3. "link" - URL or reference
4. "idea" - Future idea or brainstorm

For tasks, extract:
- task_name: Clear, actionable name
- suggested_domain: Best matching domain
- suggested_project: Existing or new project name
- priority: 1-5 (1=highest)
- description: Context

For notes/links/ideas, extract:
- type: "note", "link", or "idea"
- content: The actual content
- suggested_project: Where this belongs
- summary: Brief 1-sentence summary

Return ONLY valid JSON, no markdown.`;

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
          { role: 'user', content: textToClassify }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse classification
    let classification;
    try {
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      classification = JSON.parse(cleanResponse);
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse);
      classification = { type: 'note', content: textToClassify };
    }

    // Process based on classification type
    let createdId = null;

    if (classification.type === 'task') {
      // Find or create project
      let projectId = null;

      if (classification.suggested_project) {
        const { data: existingProject } = await supabase
          .from('projects')
          .select('id')
          .ilike('name', classification.suggested_project)
          .single();

        if (existingProject) {
          projectId = existingProject.id;
        } else {
          // Get domain id
          const { data: domain } = await supabase
            .from('domains')
            .select('id')
            .ilike('name', classification.suggested_domain || 'SSC')
            .single();

          // Create project
          const { data: newProject } = await supabase
            .from('projects')
            .insert({
              name: classification.suggested_project,
              domain_id: domain?.id,
              priority: classification.priority || 3
            })
            .select()
            .single();

          projectId = newProject?.id;
        }
      }

      // Create task
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          name: (classification.task_name || textToClassify).slice(0, 255),
          description: (classification.description || '').slice(0, 1000),
          project_id: projectId,
          priority: classification.priority || 3,
          is_top_priority: classification.priority === 1
        })
        .select()
        .single();

      if (taskError) throw taskError;
      createdId = newTask?.id;

    } else {
      // Store as knowledge item
      let projectId = null;

      if (classification.suggested_project) {
        const { data: existingProject } = await supabase
          .from('projects')
          .select('id')
          .ilike('name', classification.suggested_project)
          .single();

        projectId = existingProject?.id;
      }

      const knowledgeType = ['note', 'link', 'idea'].includes(classification.type) 
        ? classification.type 
        : 'note';

      const { data: newKnowledge, error: knowledgeError } = await supabase
        .from('knowledge_items')
        .insert({
          type: knowledgeType,
          content: (classification.content || textToClassify).slice(0, 10000),
          project_id: projectId,
          url: classification.url || null
        })
        .select()
        .single();

      if (knowledgeError) throw knowledgeError;
      createdId = newKnowledge?.id;
    }

    // Mark intake item as processed by updating parsed_type
    await supabase
      .from('intake_items')
      .update({ parsed_type: classification.type })
      .eq('id', intakeItemId);

    // Then delete it
    await supabase
      .from('intake_items')
      .delete()
      .eq('id', intakeItemId);

    return new Response(
      JSON.stringify({
        success: true,
        action: 'processed',
        classification,
        createdId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-intake:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});