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
    const { taskId } = await req.json();
    
    // Validate input
    if (!taskId || typeof taskId !== 'string') {
      throw new Error('Invalid task ID');
    }

    console.log('Searching knowledge for task:', taskId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        name,
        description,
        project_id,
        project:projects!inner(
          id,
          name,
          domain:domains!inner(name)
        )
      `)
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new Error('Task not found');
    }

    // Get already linked knowledge items
    const { data: existingLinks } = await supabase
      .from('task_knowledge_links')
      .select('knowledge_item_id')
      .eq('task_id', taskId);

    const linkedIds = existingLinks?.map(l => l.knowledge_item_id) || [];

    // Search knowledge items
    let query = supabase
      .from('knowledge_items')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by same project if task has project
    if (task.project_id) {
      query = query.eq('project_id', task.project_id);
    }

    const { data: knowledgeItems, error: knowledgeError } = await query;

    if (knowledgeError) throw knowledgeError;

    // Extract keywords from task name and description
    const taskText = `${task.name} ${task.description || ''}`.toLowerCase();
    const keywords = taskText
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10); // Top 10 keywords

    // Score and filter knowledge items
    const scoredItems = (knowledgeItems || []).map(item => {
      let score = 0;
      const itemText = `${item.content} ${item.url || ''}`.toLowerCase();

      // Boost if same project
      if (item.project_id === task.project_id) {
        score += 10;
      }

      // Keyword matching
      keywords.forEach(keyword => {
        if (itemText.includes(keyword)) {
          score += 2;
        }
      });

      // Boost notes over links/ideas
      if (item.type === 'note') {
        score += 1;
      }

      return {
        ...item,
        score,
        isLinked: linkedIds.includes(item.id)
      };
    });

    // Filter and sort
    const relevantItems = scoredItems
      .filter(item => item.score > 0)
      .sort((a, b) => {
        // Linked items first, then by score
        if (a.isLinked && !b.isLinked) return -1;
        if (!a.isLinked && b.isLinked) return 1;
        return b.score - a.score;
      })
      .slice(0, 10); // Top 10 results

    return new Response(
      JSON.stringify({
        task: {
          id: task.id,
          name: task.name,
          project: (task.project as any)?.name
        },
        knowledgeItems: relevantItems,
        linkedCount: linkedIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-knowledge:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});