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
    console.log('Generating second brain digest...');

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract and validate JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Invalid authentication token');
    }

    const userId = user.id;
    console.log('User ID:', userId);

    // Calculate date thresholds
    const today = new Date().toISOString().split('T')[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel
    const [
      contactsResult,
      projectsResult,
      insightsResult,
      captureResult,
      tasksResult
    ] = await Promise.all([
      // 1. Contacts needing follow-up
      supabase
        .from('contacts')
        .select('name, context, follow_up')
        .eq('user_id', userId)
        .not('follow_up', 'is', null)
        .limit(10),

      // 2. Stuck projects (waiting or blocked status)
      supabase
        .from('projects')
        .select('name, status')
        .eq('user_id', userId)
        .in('status', ['waiting', 'blocked', 'on hold'])
        .limit(10),

      // 3. Unused learning insights with application
      supabase
        .from('learning_insights')
        .select('title, key_insight, application, category')
        .eq('user_id', userId)
        .eq('applied', false)
        .not('application', 'is', null)
        .limit(5),

      // 4. Recent captures from last 3 days
      supabase
        .from('capture_log')
        .select('raw_input, classified_as, created_at')
        .eq('user_id', userId)
        .gte('created_at', threeDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10),

      // 5. Tasks due today or overdue
      supabase
        .from('tasks')
        .select('name, priority, due_date, is_top_priority')
        .eq('user_id', userId)
        .is('archived_at', null)
        .lte('due_date', today)
        .order('priority', { ascending: true })
        .limit(10)
    ]);

    // Log query results for debugging
    console.log('Contacts needing follow-up:', contactsResult.data?.length || 0);
    console.log('Stuck projects:', projectsResult.data?.length || 0);
    console.log('Unused insights:', insightsResult.data?.length || 0);
    console.log('Recent captures:', captureResult.data?.length || 0);
    console.log('Tasks due today/overdue:', tasksResult.data?.length || 0);

    const contacts = contactsResult.data || [];
    const projects = projectsResult.data || [];
    const insights = insightsResult.data || [];
    const captures = captureResult.data || [];
    const tasks = tasksResult.data || [];

    // Check if there's any data at all
    const hasData = contacts.length > 0 || projects.length > 0 || 
                    insights.length > 0 || captures.length > 0 || tasks.length > 0;

    if (!hasData) {
      console.log('No data available for digest');
      const emptyDigest = `🌅 MORNING DIGEST - ${formatDate(new Date())}

📬 OPEN LOOPS (0)
Nothing pending - you're all caught up!

💡 CONTEXT YOU MIGHT NEED
No specific insights queued. Great time to learn something new!

🎯 TODAY'S FOCUS
No tasks due today. Consider:
1. Review your yearly goals
2. Capture new ideas in the Brain Bar
3. Check in on long-term projects

✨ Fresh slate today. Make it count!`;

      return new Response(
        JSON.stringify({ digest: emptyDigest, data: { contacts, projects, insights, captures, tasks } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context for AI
    const openLoopsContext = [
      ...contacts.map(c => `• Follow up with ${c.name}: ${c.follow_up}`),
      ...projects.map(p => `• Project "${p.name}" is ${p.status}`)
    ].join('\n');

    const insightsContext = insights.map(i => 
      `• ${i.title} (${i.category}): ${i.key_insight} → Application: ${i.application}`
    ).join('\n');

    const capturesContext = captures.map(c => 
      `• [${c.classified_as}] ${c.raw_input.substring(0, 100)}${c.raw_input.length > 100 ? '...' : ''}`
    ).join('\n');

    const tasksContext = tasks.map(t => {
      const priorityLabel = t.priority === 1 ? '🔴' : t.priority === 2 ? '🟡' : '🟢';
      const topFlag = t.is_top_priority ? '⭐' : '';
      return `• ${priorityLabel}${topFlag} ${t.name}${t.due_date ? ` (due: ${t.due_date})` : ''}`;
    }).join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are Craig's morning assistant generating a strategic daily digest.

Your role is to synthesize information from Craig's second brain into actionable morning briefing.
Be concise, direct, and focus on what matters TODAY.

Guidelines:
- Keep total digest under 200 words
- Prioritize urgency and impact
- Connect insights to today's tasks where relevant
- Be encouraging but realistic
- Use the exact format specified`;

    const userPrompt = `Generate a morning digest using this data:

TODAY'S DATE: ${formatDate(new Date())}

OPEN LOOPS (${contacts.length + projects.length} total):
People needing follow-up (${contacts.length}):
${openLoopsContext || 'None'}

UNUSED INSIGHTS (${insights.length}):
${insightsContext || 'None available'}

RECENT CAPTURES (last 3 days, ${captures.length} items):
${capturesContext || 'None'}

TODAY'S TASKS (${tasks.length}):
${tasksContext || 'No tasks due today'}

Generate the digest in this EXACT format (under 200 words total):

🌅 MORNING DIGEST - {Day, Month Date}

📬 OPEN LOOPS ({count})
{List people to follow up with and stuck projects - max 5 items, prioritized}

💡 CONTEXT YOU MIGHT NEED
{1-2 relevant insights that might help with today's work}

🎯 TODAY'S FOCUS
{Top 3 priority tasks}

{Brief closing note - pattern you noticed or encouragement}`;

    console.log('Calling AI gateway for digest generation...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
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
    const digest = data.choices[0].message.content;
    console.log('Digest generated successfully');

    return new Response(
      JSON.stringify({ 
        digest, 
        data: { 
          contacts: contacts.length, 
          projects: projects.length, 
          insights: insights.length, 
          captures: captures.length, 
          tasks: tasks.length 
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in second-brain-digest:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}
