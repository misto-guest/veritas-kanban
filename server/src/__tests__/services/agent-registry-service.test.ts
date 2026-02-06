/**
 * Agent Registry Service Unit Tests
 *
 * @see https://github.com/BradGroux/veritas-kanban/issues/52
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fs-helpers before importing the service
vi.mock('../../storage/fs-helpers.js', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Must import after mock
const { AgentRegistryService } = await import('../../services/agent-registry-service.js');

describe('AgentRegistryService', () => {
  let service: InstanceType<typeof AgentRegistryService>;

  beforeEach(() => {
    service = new AgentRegistryService();
  });

  afterEach(() => {
    service.dispose();
  });

  // ── Registration ─────────────────────────────────────────────

  describe('register()', () => {
    it('should register a new agent', () => {
      const result = service.register({
        name: 'test-agent',
        agentType: 'claude-code',
        capabilities: ['code', 'test'],
      });

      expect(result.isNew).toBe(true);
      expect(result.agent.name).toBe('test-agent');
      expect(result.agent.agentType).toBe('claude-code');
      expect(result.agent.capabilities).toEqual(['code', 'test']);
      expect(result.agent.status).toBe('alive');
      expect(result.agent.id).toBeDefined();
      expect(result.agent.registeredAt).toBeDefined();
      expect(result.agent.lastHeartbeat).toBeDefined();
    });

    it('should re-register an existing agent by name', () => {
      const first = service.register({
        name: 'test-agent',
        agentType: 'claude-code',
        capabilities: ['code'],
      });

      const second = service.register({
        name: 'test-agent',
        agentType: 'claude-code',
        capabilities: ['code', 'test', 'review'],
        model: 'claude-sonnet-4-20250514',
      });

      expect(second.isNew).toBe(false);
      expect(second.agent.id).toBe(first.agent.id);
      expect(second.agent.capabilities).toEqual(['code', 'test', 'review']);
      expect(second.agent.model).toBe('claude-sonnet-4-20250514');
      expect(second.agent.status).toBe('alive');
    });

    it('should register multiple agents with different names', () => {
      service.register({ name: 'agent-1', agentType: 'claude-code', capabilities: ['code'] });
      service.register({ name: 'agent-2', agentType: 'copilot', capabilities: ['code', 'review'] });

      const agents = service.listAgents({ includeOffline: true });
      expect(agents).toHaveLength(2);
    });

    it('should preserve and merge metadata on re-register', () => {
      service.register({
        name: 'test-agent',
        agentType: 'claude-code',
        capabilities: ['code'],
        metadata: { host: 'mac-mini', session: 'abc' },
      });

      const result = service.register({
        name: 'test-agent',
        agentType: 'claude-code',
        capabilities: ['code'],
        metadata: { session: 'def', newField: true },
      });

      expect(result.agent.metadata).toEqual({
        host: 'mac-mini',
        session: 'def',
        newField: true,
      });
    });
  });

  // ── Heartbeat ────────────────────────────────────────────────

  describe('heartbeat()', () => {
    it('should update agent status', () => {
      const { agent } = service.register({
        name: 'test-agent',
        agentType: 'claude-code',
        capabilities: ['code'],
      });

      const updated = service.heartbeat(agent.id, {
        status: 'working',
        taskId: 'TASK-1',
        taskTitle: 'Fix the bug',
      });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('working');
      expect(updated!.activeSession).toBeDefined();
      expect(updated!.activeSession!.taskId).toBe('TASK-1');
      expect(updated!.activeSession!.taskTitle).toBe('Fix the bug');
    });

    it('should return null for unknown agent', () => {
      const result = service.heartbeat('nonexistent', { status: 'alive' });
      expect(result).toBeNull();
    });

    it('should create a new session when task changes', () => {
      const { agent } = service.register({
        name: 'test-agent',
        agentType: 'claude-code',
        capabilities: ['code'],
      });

      service.heartbeat(agent.id, { status: 'working', taskId: 'TASK-1', taskTitle: 'First task' });
      service.heartbeat(agent.id, { status: 'working', taskId: 'TASK-2', taskTitle: 'Second task' });

      const updated = service.getAgent(agent.id);
      expect(updated!.activeSession!.taskId).toBe('TASK-2');

      const history = service.getSessionHistory(agent.id);
      expect(history).toHaveLength(1);
      expect(history[0].taskId).toBe('TASK-1');
      expect(history[0].outcome).toBe('success');
    });

    it('should end session on idle status', () => {
      const { agent } = service.register({
        name: 'test-agent',
        agentType: 'claude-code',
        capabilities: ['code'],
      });

      service.heartbeat(agent.id, { status: 'working', taskId: 'TASK-1' });
      service.heartbeat(agent.id, { status: 'idle', message: 'Done with the task' });

      const updated = service.getAgent(agent.id);
      expect(updated!.activeSession).toBeUndefined();

      const history = service.getSessionHistory(agent.id);
      expect(history).toHaveLength(1);
      expect(history[0].outcome).toBe('success');
      expect(history[0].summary).toBe('Done with the task');
    });

    it('should end session on error status with failure outcome', () => {
      const { agent } = service.register({
        name: 'test-agent',
        agentType: 'claude-code',
        capabilities: ['code'],
      });

      service.heartbeat(agent.id, { status: 'working', taskId: 'TASK-1' });
      service.heartbeat(agent.id, { status: 'error', message: 'Something broke' });

      const history = service.getSessionHistory(agent.id);
      expect(history[0].outcome).toBe('failure');
      expect(history[0].summary).toBe('Something broke');
    });

    it('should update capabilities on heartbeat', () => {
      const { agent } = service.register({
        name: 'test-agent',
        agentType: 'claude-code',
        capabilities: ['code'],
      });

      service.heartbeat(agent.id, { status: 'alive', capabilities: ['code', 'test', 'deploy'] });

      const updated = service.getAgent(agent.id);
      expect(updated!.capabilities).toEqual(['code', 'test', 'deploy']);
    });
  });

  // ── Listing ──────────────────────────────────────────────────

  describe('listAgents()', () => {
    it('should list active agents', () => {
      service.register({ name: 'a1', agentType: 'claude-code', capabilities: ['code'] });
      service.register({ name: 'a2', agentType: 'copilot', capabilities: ['code', 'review'] });

      const agents = service.listAgents();
      expect(agents).toHaveLength(2);
    });

    it('should filter by status', () => {
      const { agent: a1 } = service.register({ name: 'a1', agentType: 'claude-code', capabilities: ['code'] });
      service.register({ name: 'a2', agentType: 'copilot', capabilities: ['code'] });

      service.heartbeat(a1.id, { status: 'working', taskId: 'T1' });

      const working = service.listAgents({ status: 'working' });
      expect(working).toHaveLength(1);
      expect(working[0].name).toBe('a1');
    });

    it('should filter by capability', () => {
      service.register({ name: 'a1', agentType: 'claude-code', capabilities: ['code', 'test'] });
      service.register({ name: 'a2', agentType: 'copilot', capabilities: ['code'] });

      const testers = service.listAgents({ capability: 'test' });
      expect(testers).toHaveLength(1);
      expect(testers[0].name).toBe('a1');
    });

    it('should filter by agentType', () => {
      service.register({ name: 'a1', agentType: 'claude-code', capabilities: ['code'] });
      service.register({ name: 'a2', agentType: 'copilot', capabilities: ['code'] });

      const claudeAgents = service.listAgents({ agentType: 'claude-code' });
      expect(claudeAgents).toHaveLength(1);
      expect(claudeAgents[0].name).toBe('a1');
    });

    it('should exclude offline agents by default', () => {
      const { agent } = service.register({ name: 'a1', agentType: 'claude-code', capabilities: ['code'] });
      service.register({ name: 'a2', agentType: 'copilot', capabilities: ['code'] });

      service.heartbeat(agent.id, { status: 'offline' });

      const active = service.listAgents();
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('a2');

      const all = service.listAgents({ includeOffline: true });
      expect(all).toHaveLength(2);
    });

    it('should sort by status priority (working > alive > idle)', () => {
      const { agent: a1 } = service.register({ name: 'idle-agent', agentType: 'a', capabilities: ['code'] });
      const { agent: a2 } = service.register({ name: 'working-agent', agentType: 'b', capabilities: ['code'] });
      service.register({ name: 'alive-agent', agentType: 'c', capabilities: ['code'] });

      service.heartbeat(a1.id, { status: 'idle' });
      service.heartbeat(a2.id, { status: 'working', taskId: 'T1' });

      const agents = service.listAgents();
      expect(agents[0].name).toBe('working-agent');
      expect(agents[1].name).toBe('alive-agent');
      expect(agents[2].name).toBe('idle-agent');
    });
  });

  // ── Lookup ───────────────────────────────────────────────────

  describe('getAgent() / getAgentByName()', () => {
    it('should get agent by ID', () => {
      const { agent } = service.register({ name: 'test', agentType: 'x', capabilities: ['code'] });
      const found = service.getAgent(agent.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('test');
    });

    it('should get agent by name', () => {
      service.register({ name: 'my-agent', agentType: 'x', capabilities: ['code'] });
      const found = service.getAgentByName('my-agent');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('my-agent');
    });

    it('should return null for unknown ID', () => {
      expect(service.getAgent('nope')).toBeNull();
    });

    it('should return null for unknown name', () => {
      expect(service.getAgentByName('nope')).toBeNull();
    });
  });

  // ── Session Management ───────────────────────────────────────

  describe('endSession()', () => {
    it('should end an active session', () => {
      const { agent } = service.register({ name: 'test', agentType: 'x', capabilities: ['code'] });
      service.heartbeat(agent.id, { status: 'working', taskId: 'T1', taskTitle: 'My Task' });

      const session = service.endSession(agent.id, 'success', 'All done');
      expect(session).not.toBeNull();
      expect(session!.taskId).toBe('T1');
      expect(session!.outcome).toBe('success');
      expect(session!.summary).toBe('All done');
      expect(session!.endedAt).toBeDefined();

      const updated = service.getAgent(agent.id);
      expect(updated!.activeSession).toBeUndefined();
    });

    it('should return null if no active session', () => {
      const { agent } = service.register({ name: 'test', agentType: 'x', capabilities: ['code'] });
      const session = service.endSession(agent.id);
      expect(session).toBeNull();
    });

    it('should return null for unknown agent', () => {
      const session = service.endSession('nonexistent');
      expect(session).toBeNull();
    });
  });

  // ── Session History ──────────────────────────────────────────

  describe('getSessionHistory()', () => {
    it('should return sessions in reverse chronological order', () => {
      const { agent } = service.register({ name: 'test', agentType: 'x', capabilities: ['code'] });

      for (let i = 1; i <= 3; i++) {
        service.heartbeat(agent.id, { status: 'working', taskId: `T${i}`, taskTitle: `Task ${i}` });
        service.heartbeat(agent.id, { status: 'idle' });
      }

      const history = service.getSessionHistory(agent.id);
      expect(history).toHaveLength(3);
      expect(history[0].taskId).toBe('T3');
      expect(history[2].taskId).toBe('T1');
    });

    it('should respect limit parameter', () => {
      const { agent } = service.register({ name: 'test', agentType: 'x', capabilities: ['code'] });

      for (let i = 1; i <= 5; i++) {
        service.heartbeat(agent.id, { status: 'working', taskId: `T${i}` });
        service.heartbeat(agent.id, { status: 'idle' });
      }

      const history = service.getSessionHistory(agent.id, 2);
      expect(history).toHaveLength(2);
      expect(history[0].taskId).toBe('T5');
      expect(history[1].taskId).toBe('T4');
    });

    it('should return empty array for unknown agent', () => {
      const history = service.getSessionHistory('nonexistent');
      expect(history).toEqual([]);
    });
  });

  // ── Unregister ───────────────────────────────────────────────

  describe('unregister()', () => {
    it('should remove an agent', () => {
      const { agent } = service.register({ name: 'test', agentType: 'x', capabilities: ['code'] });
      const removed = service.unregister(agent.id);
      expect(removed).toBe(true);
      expect(service.getAgent(agent.id)).toBeNull();
    });

    it('should return false for unknown agent', () => {
      expect(service.unregister('nonexistent')).toBe(false);
    });

    it('should not remove session history', () => {
      const { agent } = service.register({ name: 'test', agentType: 'x', capabilities: ['code'] });
      service.heartbeat(agent.id, { status: 'working', taskId: 'T1' });
      service.heartbeat(agent.id, { status: 'idle' });

      service.unregister(agent.id);

      const history = service.getSessionHistory(agent.id);
      expect(history).toHaveLength(1);
    });
  });
});
