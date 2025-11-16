# Security Policy

## Data Security

### Authentication
- All data access requires user authentication via Supabase Auth
- JWT tokens used for session management
- Tokens automatically refreshed by Supabase client
- Email/password authentication with secure password hashing (bcrypt)

### Row Level Security (RLS)
All database tables have RLS policies enabled to ensure data isolation:

**Profiles Table**
- Users can only view/update their own profile
- Profile automatically created on signup via trigger

**User Data Tables** (domains, projects, tasks, knowledge_items, intake_items)
- All queries automatically filtered by `user_id = auth.uid()`
- Users cannot access other users' data
- INSERT operations require matching user_id
- UPDATE/DELETE operations only allowed on own records

**Related Tables** (task_steps, task_knowledge_links)
- Access controlled through parent task ownership
- Verified via subquery to tasks table

### Edge Function Security

**Authentication Required**
- All edge functions verify JWT token from Authorization header
- User identity extracted from token via `supabase.auth.getUser()`
- Functions return 401 for missing/invalid auth

**Service Role Key Usage**
- Used only in edge functions for privileged operations
- Never exposed to client code
- All queries still filtered by authenticated user ID

### API Keys & Secrets

**Environment Variables** (Public)
```env
VITE_SUPABASE_URL=<project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```
- Safe to expose in client code
- Anon key has limited permissions via RLS policies

**Secret Management** (Private)
Managed via Lovable Cloud backend:
- `LOVABLE_API_KEY`: AI Gateway access
- `SUPABASE_SERVICE_ROLE_KEY`: Backend operations
- `SUPABASE_DB_URL`: Direct database connection

**Security Best Practices**
- Never commit secrets to version control
- Rotate keys regularly
- Use Lovable Cloud backend interface for secret management
- Service role key only in edge functions, never client

### Input Validation

**Client-Side**
- Form validation before submission
- Type checking with TypeScript
- Length limits enforced (e.g., 5000 chars for intake items)

**Server-Side** (Edge Functions)
- Validate all inputs before processing
- Sanitize user input for AI prompts
- Use parameterized queries (Supabase client handles this)

**Database Constraints**
- NOT NULL constraints on critical fields
- Foreign key relationships enforced
- UUID generation for IDs
- Timestamps auto-managed

### Vulnerability Prevention

**SQL Injection**
- Protected by Supabase client library
- Never use raw SQL from client
- Parameterized queries only

**XSS (Cross-Site Scripting)**
- React auto-escapes content by default
- No use of dangerouslySetInnerHTML with user content
- Content Security Policy headers in production

**CSRF (Cross-Site Request Forgery)**
- Protected by Supabase Auth token system
- SameSite cookie policies
- Token verification on each request

**Authorization Bypass**
- RLS policies prevent horizontal privilege escalation
- User ID verified on every database operation
- No client-side role checks

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do NOT** open a public GitHub issue
2. Email security concerns to: [your-security-email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work to resolve critical issues immediately.

## Security Updates

### Current Security Status
✅ Row Level Security enabled on all tables
✅ Authentication required for all operations
✅ JWT token verification in edge functions  
✅ Input validation on client and server
✅ Secrets management via secure backend
✅ TypeScript type safety
✅ HTTPS only in production

### Pending Improvements
- [ ] Rate limiting on edge functions
- [ ] Audit logging for sensitive operations
- [ ] Two-factor authentication option
- [ ] Session management UI
- [ ] Security headers optimization

## Compliance

### Data Handling
- User data encrypted at rest (Supabase)
- Data encrypted in transit (HTTPS/TLS)
- No third-party data sharing
- Users own their data

### Data Retention
- User data retained indefinitely unless deleted
- Deleted data removed via CASCADE constraints
- No soft deletes (permanent deletion)

### Right to be Forgotten
Users can request complete data deletion:
1. Contact support
2. Account and all data will be permanently deleted
3. Cannot be recovered after deletion

## Security Checklist for Development

Before deploying new features:
- [ ] RLS policies added for new tables
- [ ] User authentication verified in edge functions
- [ ] Input validation on client and server
- [ ] TypeScript types properly defined
- [ ] Error messages don't leak sensitive info
- [ ] Secrets not hardcoded or committed
- [ ] Edge functions use authenticated user ID
- [ ] Database migrations include proper constraints
