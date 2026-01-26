import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTask } from '@/hooks/useTasks';
import { useTemplates, type TaskTemplate } from '@/hooks/useTemplates';
import type { TaskType, TaskPriority } from '@veritas-kanban/shared';
import { FileText } from 'lucide-react';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('code');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [project, setProject] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const createTask = useCreateTask();
  const { data: templates } = useTemplates();

  const applyTemplate = (template: TaskTemplate) => {
    setSelectedTemplate(template.id);
    if (template.taskDefaults.type) setType(template.taskDefaults.type);
    if (template.taskDefaults.priority) setPriority(template.taskDefaults.priority);
    if (template.taskDefaults.project) setProject(template.taskDefaults.project);
    if (template.taskDefaults.descriptionTemplate) setDescription(template.taskDefaults.descriptionTemplate);
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      project: project.trim() || undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setType('code');
    setPriority('medium');
    setProject('');
    setSelectedTemplate(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          
          {/* Template selector */}
          {templates && templates.length > 0 && (
            <div className="flex items-center gap-2 py-2 border-b">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedTemplate || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    clearTemplate();
                  } else {
                    const template = templates.find(t => t.id === value);
                    if (template) applyTemplate(template);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Use a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.description && (
                        <span className="text-muted-foreground ml-2">
                          — {template.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
                autoFocus
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the task..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="project">Project (optional)</Label>
              <Input
                id="project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g., rubicon"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createTask.isPending}>
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
