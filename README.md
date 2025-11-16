# CTRL:Craig - Workflow Intelligence System

A productivity and workflow intelligence application that helps you manage tasks, projects, and knowledge with AI-powered insights.

## Features

### Layer 1 - Workflow Intelligence
- **Daily Briefing**: AI-generated morning briefing with top 3 tasks, changes, and focus suggestions
- **Momentum Score**: Real-time productivity tracking showing completion rate and trends
- **Task Aging Alerts**: Automatic detection of stagnant tasks with actionable suggestions

### Layer 2 - Intake Automation  
- **Intake Queue**: Centralized queue for unprocessed information
- **AI Classification**: Automatic categorization of notes, tasks, links, and ideas
- **Context Linker**: Smart knowledge base that links relevant information to tasks

## Security Overview

🔒 **Enterprise-grade security**:
- Row Level Security (RLS) on all tables
- JWT-based authentication
- User data isolation
- Encrypted at rest and in transit

See [SECURITY.md](./SECURITY.md) for complete security documentation.

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Lovable Cloud account (provides Supabase backend)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ctrl-craig

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun dev
```

### First Time Setup

1. **Create an Account**: Navigate to `/auth` and sign up
2. **Auto-confirm is Enabled**: No email verification needed for testing
3. **Start Using**: Begin adding tasks via the Brain Bar

## Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **UI**: Shadcn/ui, Tailwind CSS
- **Backend**: Supabase (via Lovable Cloud)
- **AI**: Lovable AI Gateway (Google Gemini, OpenAI GPT)
- **Auth**: Supabase Auth with RLS

### Database Schema

**Core Tables**:
- `profiles` - User profiles
- `domains` - Life/work areas (Health, Skills, etc.)
- `projects` - Projects within domains
- `tasks` - Tasks with progress tracking
- `task_steps` - Granular task steps
- `knowledge_items` - Notes and reference materials
- `task_knowledge_links` - Task-knowledge relationships  
- `intake_items` - Unprocessed information queue

All tables have `user_id` column with RLS policies for data isolation.

### Edge Functions

AI-powered serverless functions:
- `classify-input` - Categorizes user input
- `daily-briefing` - Generates morning briefing
- `momentum-score` - Calculates productivity metrics
- `generate-steps` - Breaks down tasks
- `search-knowledge` - Finds relevant knowledge
- `summarize-knowledge` - Creates AI summaries
- `process-intake` - Processes intake queue

## Development

### Project Structure
```
src/
├── components/        # React components
│   ├── ui/           # Shadcn UI components  
│   └── *.tsx         # Feature components
├── pages/            # Route pages
├── types/            # TypeScript types
├── integrations/     # Supabase client
└── lib/              # Utilities

supabase/
├── functions/        # Edge functions
└── migrations/       # Database migrations
```

### Type Safety

Database types are auto-generated:
```typescript
import { Tables } from '@/integrations/supabase/types';
import { Task, Project } from '@/types/database';
```

### Adding Features

1. **Database Changes**: Use migration tool
2. **RLS Policies**: Always add user_id policies
3. **Types**: Import from `@/types/database`
4. **Error Handling**: Provide friendly messages
5. **Loading States**: Show indicators for async ops

### Environment Variables

Automatically configured by Lovable Cloud:
```env
VITE_SUPABASE_URL=<auto-configured>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto-configured>
VITE_SUPABASE_PROJECT_ID=<auto-configured>
```

Never commit `.env` to version control.

## Troubleshooting

### Can't See Data After Login
- Check RLS policies include `user_id` filter
- Verify `user_id` is set when creating records
- Ensure auth token is sent with requests

### Type Errors
- Database types auto-update after migrations
- Restart dev server if types seem stale
- Check imports from correct path

### Edge Function Errors
- Check logs in Lovable Cloud backend
- Verify secrets are configured
- Ensure Authorization header is included

## Testing

### Manual Testing Checklist
- [ ] Sign up new user
- [ ] Create task via Brain Bar
- [ ] View daily briefing
- [ ] Check momentum score
- [ ] Add intake item
- [ ] Process intake queue
- [ ] Link knowledge to task
- [ ] Log out and log back in
- [ ] Verify data isolation (create second user)

## Deployment

### Via Lovable
1. Open project in Lovable
2. Click Share → Publish
3. Custom domain optional (Settings → Domains)

### Manual Deployment
Build for production:
```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

## Contributing

1. Create feature branch
2. Make changes with proper types
3. Test authentication & RLS
4. Update documentation
5. Submit pull request

## License

[Your License Here]

## Links

- [Lovable Documentation](https://docs.lovable.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Security Policy](./SECURITY.md)

