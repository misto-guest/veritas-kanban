import { useMemo, useState } from 'react';
import { Archive, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBulkArchive } from '@/hooks/useTasks';
import type { Task } from '@veritas-kanban/shared';

interface ProjectArchiveSuggestionProps {
  tasks: Task[];
}

interface CompletedProject {
  name: string;
  taskCount: number;
}

export function ProjectArchiveSuggestion({ tasks }: ProjectArchiveSuggestionProps) {
  const bulkArchive = useBulkArchive();
  const [dismissedProjects, setDismissedProjects] = useState<Set<string>>(new Set());
  const [archivingProject, setArchivingProject] = useState<string | null>(null);

  // Find projects where all tasks are done
  const completedProjects = useMemo(() => {
    const projectTaskCounts = new Map<string, { total: number; done: number }>();
    
    tasks.forEach(task => {
      if (!task.project) return;
      
      const counts = projectTaskCounts.get(task.project) || { total: 0, done: 0 };
      counts.total++;
      if (task.status === 'done') counts.done++;
      projectTaskCounts.set(task.project, counts);
    });

    const completed: CompletedProject[] = [];
    projectTaskCounts.forEach((counts, name) => {
      if (counts.total > 0 && counts.total === counts.done && !dismissedProjects.has(name)) {
        completed.push({ name, taskCount: counts.total });
      }
    });

    return completed;
  }, [tasks, dismissedProjects]);

  const handleArchive = async (project: string) => {
    setArchivingProject(project);
    try {
      await bulkArchive.mutateAsync(project);
      setDismissedProjects(prev => new Set(prev).add(project));
    } finally {
      setArchivingProject(null);
    }
  };

  const handleDismiss = (project: string) => {
    setDismissedProjects(prev => new Set(prev).add(project));
  };

  if (completedProjects.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {completedProjects.map(project => (
        <div
          key={project.name}
          className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
        >
          <Archive className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              All tasks in "{project.name}" are complete!
            </p>
            <p className="text-xs text-muted-foreground">
              {project.taskCount} task{project.taskCount > 1 ? 's' : ''} ready to archive
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleArchive(project.name)}
              disabled={archivingProject === project.name}
            >
              {archivingProject === project.name ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-1" />
              )}
              Archive All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDismiss(project.name)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
