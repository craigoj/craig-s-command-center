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
    console.log('Generating weekly second brain review...');

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
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();
    const weekStartDate = getWeekStartDate(now);

    // Run all queries in parallel
    const [
      capturesResult,
      projectsResult,
      stagnantProjectsResult,
      insightsResult,
      contactsResult,
      tasksCompletedResult,
      tasksCreatedResult,
      needsReviewResult
    ] = await Promise.all([
      // 1. All capture_log entries from past 7 days
      supabase
        .from('capture_log')
        .select('classified_as, confidence_score, created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgoISO),

      // 2. All projects to check for stagnation
      supabase
        .from('projects')
        .select('id, name, status, created_at')
        .eq('user_id', userId)
        .in('status', ['active', 'planning']),

      // 2b. Tasks updated in last 7 days (to find stagnant projects)
      supabase
        .from('tasks')
        .select('project_id, created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgoISO),

      // 3. Learning insights created this week
      supabase
        .from('learning_insights')
        .select('title, category, key_insight, applied')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgoISO),

      // 4. Contacts added or updated this week
      supabase
        .from('contacts')
        .select('name, context, follow_up, tags')
        .eq('user_id', userId)
        .gte('updated_at', sevenDaysAgoISO),

      // 5a. Tasks completed this week (archived)
      supabase
        .from('tasks')
        .select('id, name')
        .eq('user_id', userId)
        .gte('archived_at', sevenDaysAgoISO),

      // 5b. Tasks created this week
      supabase
        .from('tasks')
        .select('id, name')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgoISO),

      // Items needing review
      supabase
        .from('intake_items')
        .select('id')
        .eq('user_id', userId)
        .eq('needs_review', true)
    ]);

    // Process capture data - group by category
    const captures = capturesResult.data || [];
    const capturesByCategory: Record<string, number> = {};
    let totalConfidence = 0;
    let confidenceCount = 0;

    captures.forEach(c => {
      capturesByCategory[c.classified_as] = (capturesByCategory[c.classified_as] || 0) + 1;
      if (c.confidence_score !== null) {
        totalConfidence += c.confidence_score;
        confidenceCount++;
      }
    });

    const avgConfidence = confidenceCount > 0 
      ? Math.round((totalConfidence / confidenceCount) * 100) 
      : 0;

    // Find most common category
    const mostCommonCategory = Object.entries(capturesByCategory)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

    // Find stagnant projects (no task activity in 7+ days)
    const projects = projectsResult.data || [];
    const recentTaskProjectIds = new Set(
      (stagnantProjectsResult.data || []).map(t => t.project_id).filter(Boolean)
    );
    const stagnantProjects = projects.filter(p => !recentTaskProjectIds.has(p.id));

    const insights = insightsResult.data || [];
    const contacts = contactsResult.data || [];
    const tasksCompleted = tasksCompletedResult.data || [];
    const tasksCreated = tasksCreatedResult.data || [];
    const needsReviewCount = needsReviewResult.data?.length || 0;

    // Log stats
    console.log('Week stats:', {
      captures: captures.length,
      stagnantProjects: stagnantProjects.length,
      insights: insights.length,
      contacts: contacts.length,
      tasksCompleted: tasksCompleted.length,
      tasksCreated: tasksCreated.length,
      needsReview: needsReviewCount
    });

    // Build AI context
    const capturesSummary = Object.entries(capturesByCategory)
      .map(([cat, count]) => `${count} ${cat}${count > 1 ? 's' : ''}`)
      .join(', ') || 'No captures';

    const stagnantContext = stagnantProjects
      .slice(0, 5)
      .map(p => `• "${p.name}" (${p.status}) - no task activity`)
      .join('\n') || 'None - all projects are active!';

    const insightsContext = insights
      .slice(0, 5)
      .map(i => `• ${i.title} (${i.category}): ${i.key_insight}`)
      .join('\n') || 'No new insights captured';

    const contactsContext = contacts
      .slice(0, 5)
      .map(c => {
        const tags = c.tags?.join(', ') || 'no tags';
        const followUp = c.follow_up ? ` → ${c.follow_up}` : '';
        return `• ${c.name} (${tags})${followUp}`;
      })
      .join('\n') || 'No contact activity';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are Craig's Sunday strategist analyzing the week's second brain activity.

Your role is to find patterns, identify open loops, and suggest strategic focus for the coming week.
Be insightful, direct, and action-oriented. Look for connections the user might have missed.

Guidelines:
- Keep total review under 300 words
- Be specific about patterns you notice
- Suggest concrete actions, not vague goals
- Celebrate wins while addressing gaps
- Connect insights to potential actions`;

    const userPrompt = `Generate a weekly second brain review using this data:

WEEK OF: ${weekStartDate}

CAPTURES THIS WEEK (${captures.length} total):
${capturesSummary}
Category breakdown: ${JSON.stringify(capturesByCategory)}

STAGNANT PROJECTS (no activity in 7+ days):
${stagnantContext}

NEW INSIGHTS THIS WEEK (${insights.length}):
${insightsContext}

PEOPLE INTERACTIONS (${contacts.length} contacts added/updated):
${contactsContext}

TASK METRICS:
- Tasks completed: ${tasksCompleted.length}
- Tasks created: ${tasksCreated.length}
- Completion ratio: ${tasksCreated.length > 0 ? Math.round((tasksCompleted.length / tasksCreated.length) * 100) : 0}%

CAPTURE HEALTH:
- Average confidence: ${avgConfidence}%
- Items needing review: ${needsReviewCount}
- Most common category: ${mostCommonCategory}

Generate the review in this EXACT format (under 300 words total):

📊 SECOND BRAIN REVIEW - Week of {Date}

THIS WEEK YOU CAPTURED:
{Summary: X tasks, Y people, Z insights, etc. - be specific}

BIGGEST OPEN LOOPS:
• {Specific stuck item with why it might be stuck}
• {Another open loop that needs attention}

PATTERNS NOTICED:
{One insight from analyzing captures - connections, themes, repeated topics, opportunities}

SUGGESTED FOCUS FOR NEXT WEEK:
1. {Strategic action based on stagnant projects}
2. {Action based on insights captured}
3. {Relationship or follow-up action}

CAPTURE HEALTH:
• Confidence avg: {X}%
• Items needing review: {X}
• Most common category: {category}
{Brief assessment of capture quality}`;

    console.log('Calling AI gateway for weekly review...');

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
    const review = data.choices[0].message.content;
    console.log('Weekly review generated successfully');

    return new Response(
      JSON.stringify({ 
        review, 
        stats: { 
          captures: captures.length,
          capturesByCategory,
          stagnantProjects: stagnantProjects.length,
          insights: insights.length,
          contacts: contacts.length,
          tasksCompleted: tasksCompleted.length,
          tasksCreated: tasksCreated.length,
          avgConfidence,
          needsReview: needsReviewCount,
          mostCommonCategory
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in weekly-second-brain-review:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getWeekStartDate(date: Date): string {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(date.setDate(diff));
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[monday.getMonth()]} ${monday.getDate()}, ${monday.getFullYear()}`;
}
