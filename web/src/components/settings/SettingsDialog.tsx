import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  useConfig, 
  useAddRepo, 
  useRemoveRepo, 
  useValidateRepoPath,
  useUpdateAgents,
  useSetDefaultAgent,
} from '@/hooks/useConfig';
import {
  useTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  type TaskTemplate,
} from '@/hooks/useTemplates';
import { Plus, Trash2, Check, X, Loader2, FolderGit2, Bot, Star, FileText } from 'lucide-react';
import type { RepoConfig, AgentConfig, AgentType, TaskType, TaskPriority } from '@veritas-kanban/shared';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddRepoForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [branches, setBranches] = useState<string[]>([]);
  const [pathValid, setPathValid] = useState<boolean | null>(null);

  const addRepo = useAddRepo();
  const validatePath = useValidateRepoPath();

  const handleValidatePath = async () => {
    if (!path) return;
    
    try {
      const result = await validatePath.mutateAsync(path);
      setPathValid(result.valid);
      setBranches(result.branches);
      
      if (result.branches.includes('main')) {
        setDefaultBranch('main');
      } else if (result.branches.includes('master')) {
        setDefaultBranch('master');
      } else if (result.branches.length > 0) {
        setDefaultBranch(result.branches[0]);
      }
    } catch {
      setPathValid(false);
      setBranches([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !path || !pathValid) return;
    await addRepo.mutateAsync({ name, path, defaultBranch });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FolderGit2 className="h-4 w-4" />
        Add Repository
      </div>

      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="repo-name">Name</Label>
          <Input
            id="repo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., rubicon"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="repo-path">Path</Label>
          <div className="flex gap-2">
            <Input
              id="repo-path"
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                setPathValid(null);
                setBranches([]);
              }}
              placeholder="e.g., ~/Projects/rubicon"
              className={cn(
                pathValid === true && 'border-green-500',
                pathValid === false && 'border-red-500'
              )}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleValidatePath}
              disabled={!path || validatePath.isPending}
            >
              {validatePath.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pathValid === true ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : pathValid === false ? (
                <X className="h-4 w-4 text-red-500" />
              ) : (
                'Validate'
              )}
            </Button>
          </div>
          {pathValid === false && (
            <p className="text-xs text-red-500">
              {validatePath.error?.message || 'Invalid path'}
            </p>
          )}
        </div>

        {branches.length > 0 && (
          <div className="grid gap-2">
            <Label htmlFor="default-branch">Default Branch</Label>
            <Select value={defaultBranch} onValueChange={setDefaultBranch}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!name || !path || !pathValid || addRepo.isPending}
        >
          {addRepo.isPending ? 'Adding...' : 'Add Repository'}
        </Button>
      </div>
    </form>
  );
}

function RepoItem({ repo }: { repo: RepoConfig }) {
  const removeRepo = useRemoveRepo();

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-card">
      <div className="flex items-center gap-3">
        <FolderGit2 className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="font-medium">{repo.name}</div>
          <div className="text-xs text-muted-foreground">{repo.path}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs bg-muted px-2 py-0.5 rounded">
          {repo.defaultBranch}
        </span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove repository?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove "{repo.name}" from your configuration.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => removeRepo.mutate(repo.name)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// Template Components
function AddTemplateForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [project, setProject] = useState('');
  const [descriptionTemplate, setDescriptionTemplate] = useState('');

  const createTemplate = useCreateTemplate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    await createTemplate.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      taskDefaults: {
        type: type || undefined,
        priority: priority || undefined,
        project: project.trim() || undefined,
        descriptionTemplate: descriptionTemplate.trim() || undefined,
      },
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4" />
        Add Template
      </div>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="template-name">Name *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Bug Fix"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="template-desc">Description</Label>
            <Input
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Template for bug fixes"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label>Default Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
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
            <Label>Default Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Default Project</Label>
            <Input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="e.g., rubicon"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Description Template</Label>
          <Textarea
            value={descriptionTemplate}
            onChange={(e) => setDescriptionTemplate(e.target.value)}
            placeholder="Pre-filled description text..."
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || createTemplate.isPending}>
          {createTemplate.isPending ? 'Creating...' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
}

function TemplateItem({ template }: { template: TaskTemplate }) {
  const deleteTemplate = useDeleteTemplate();

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-card">
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="font-medium">{template.name}</div>
          <div className="text-xs text-muted-foreground">
            {[
              template.taskDefaults.type,
              template.taskDefaults.priority,
              template.taskDefaults.project,
            ].filter(Boolean).join(' • ') || 'No defaults'}
          </div>
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the "{template.name}" template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplate.mutate(template.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AgentItem({ 
  agent, 
  isDefault,
  onToggle,
  onSetDefault,
}: { 
  agent: AgentConfig; 
  isDefault: boolean;
  onToggle: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 px-3 rounded-md border',
        agent.enabled ? 'bg-card' : 'bg-muted/30'
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className={cn(
            'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
            agent.enabled 
              ? 'bg-primary border-primary text-primary-foreground' 
              : 'border-muted-foreground/50'
          )}
        >
          {agent.enabled && <Check className="h-3 w-3" />}
        </button>
        <Bot className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className={cn('font-medium', !agent.enabled && 'text-muted-foreground')}>
            {agent.name}
          </div>
          <code className="text-xs text-muted-foreground">
            {agent.command} {agent.args.join(' ')}
          </code>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {agent.enabled && (
          <Button
            variant={isDefault ? 'default' : 'ghost'}
            size="sm"
            className="h-7"
            onClick={onSetDefault}
            disabled={isDefault}
          >
            <Star className={cn('h-3 w-3 mr-1', isDefault && 'fill-current')} />
            {isDefault ? 'Default' : 'Set Default'}
          </Button>
        )}
      </div>
    </div>
  );
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: config, isLoading } = useConfig();
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddTemplateForm, setShowAddTemplateForm] = useState(false);
  const updateAgents = useUpdateAgents();
  const setDefaultAgent = useSetDefaultAgent();

  const handleToggleAgent = (agentType: AgentType) => {
    if (!config) return;
    const updatedAgents = config.agents.map(a => 
      a.type === agentType ? { ...a, enabled: !a.enabled } : a
    );
    updateAgents.mutate(updatedAgents);
  };

  const handleSetDefaultAgent = (agentType: AgentType) => {
    setDefaultAgent.mutate(agentType);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Repositories Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Git Repositories</h3>
              {!showAddForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Repo
                </Button>
              )}
            </div>

            {showAddForm && (
              <AddRepoForm onClose={() => setShowAddForm(false)} />
            )}

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : config?.repos.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
                No repositories configured. Add one to enable git integration.
              </div>
            ) : (
              <div className="space-y-2">
                {config?.repos.map((repo) => (
                  <RepoItem key={repo.name} repo={repo} />
                ))}
              </div>
            )}
          </div>

          {/* Agents Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">AI Agents</h3>
              <span className="text-xs text-muted-foreground">
                Enable agents to use on code tasks
              </span>
            </div>
            
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-2">
                {config?.agents.map((agent) => (
                  <AgentItem
                    key={agent.type}
                    agent={agent}
                    isDefault={config.defaultAgent === agent.type}
                    onToggle={() => handleToggleAgent(agent.type)}
                    onSetDefault={() => handleSetDefaultAgent(agent.type)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Templates Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Task Templates</h3>
              {!showAddTemplateForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddTemplateForm(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Template
                </Button>
              )}
            </div>

            {showAddTemplateForm && (
              <AddTemplateForm onClose={() => setShowAddTemplateForm(false)} />
            )}

            {templatesLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : !templates || templates.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
                No templates created. Templates pre-fill task fields when creating new tasks.
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <TemplateItem key={template.id} template={template} />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
