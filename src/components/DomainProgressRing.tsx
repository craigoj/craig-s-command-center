import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Domain {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export const DomainProgressRing = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainProgress, setDomainProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    const { data: domainsData } = await supabase
      .from('domains')
      .select('*')
      .order('created_at');

    if (domainsData) {
      setDomains(domainsData);

      // Calculate progress for each domain
      const progressMap: Record<string, number> = {};
      
      for (const domain of domainsData) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('domain_id', domain.id);

        if (projects && projects.length > 0) {
          const projectIds = projects.map(p => p.id);

          const { data: tasks } = await supabase
            .from('tasks')
            .select('progress')
            .in('project_id', projectIds)
            .is('archived_at', null);

          if (tasks && tasks.length > 0) {
            const avgProgress = tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length;
            progressMap[domain.id] = Math.round(avgProgress);
          } else {
            progressMap[domain.id] = 0;
          }
        } else {
          progressMap[domain.id] = 0;
        }
      }

      setDomainProgress(progressMap);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {domains.map((domain) => {
        const progress = domainProgress[domain.id] || 0;
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (progress / 100) * circumference;

        return (
          <div key={domain.id} className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="48"
                  cy="48"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="45"
                  stroke={domain.color}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: `drop-shadow(0 0 8px ${domain.color}60)`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl">{domain.icon}</span>
                <span className="text-xs font-semibold">{progress}%</span>
              </div>
            </div>
            <span className="text-sm font-medium">{domain.name}</span>
          </div>
        );
      })}
    </div>
  );
};