import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import type { TaskType, TaskPriority } from '@veritas-kanban/shared';

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  taskDefaults: {
    type?: TaskType;
    priority?: TaskPriority;
    project?: string;
    descriptionTemplate?: string;
  };
  created: string;
  updated: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  taskDefaults: {
    type?: TaskType;
    priority?: TaskPriority;
    project?: string;
    descriptionTemplate?: string;
  };
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  taskDefaults?: {
    type?: TaskType;
    priority?: TaskPriority;
    project?: string;
    descriptionTemplate?: string;
  };
}

export class TemplateService {
  private templatesDir: string;

  constructor() {
    this.templatesDir = join(process.cwd(), '.veritas-kanban', 'templates');
    this.ensureDir();
  }

  private async ensureDir() {
    if (!existsSync(this.templatesDir)) {
      await mkdir(this.templatesDir, { recursive: true });
    }
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private templatePath(id: string): string {
    return join(this.templatesDir, `${id}.md`);
  }

  async getTemplates(): Promise<TaskTemplate[]> {
    await this.ensureDir();
    
    const files = await readdir(this.templatesDir);
    const templates: TaskTemplate[] = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      try {
        const content = await readFile(join(this.templatesDir, file), 'utf-8');
        const { data } = matter(content);
        templates.push(data as TaskTemplate);
      } catch (err) {
        console.error(`Error reading template ${file}:`, err);
      }
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTemplate(id: string): Promise<TaskTemplate | null> {
    const path = this.templatePath(id);
    
    if (!existsSync(path)) {
      return null;
    }

    try {
      const content = await readFile(path, 'utf-8');
      const { data } = matter(content);
      return data as TaskTemplate;
    } catch (err) {
      console.error(`Error reading template ${id}:`, err);
      return null;
    }
  }

  async createTemplate(input: CreateTemplateInput): Promise<TaskTemplate> {
    await this.ensureDir();
    
    const id = `template_${this.slugify(input.name)}_${Date.now()}`;
    const now = new Date().toISOString();
    
    const template: TaskTemplate = {
      id,
      name: input.name,
      description: input.description,
      taskDefaults: input.taskDefaults,
      created: now,
      updated: now,
    };

    const content = matter.stringify('', template);
    await writeFile(this.templatePath(id), content, 'utf-8');
    
    return template;
  }

  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<TaskTemplate | null> {
    const existing = await this.getTemplate(id);
    if (!existing) return null;

    const updated: TaskTemplate = {
      ...existing,
      ...input,
      taskDefaults: {
        ...existing.taskDefaults,
        ...input.taskDefaults,
      },
      updated: new Date().toISOString(),
    };

    const content = matter.stringify('', updated);
    await writeFile(this.templatePath(id), content, 'utf-8');
    
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const path = this.templatePath(id);
    
    if (!existsSync(path)) {
      return false;
    }

    await unlink(path);
    return true;
  }
}
