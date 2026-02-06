/**
 * Agent Registry Route Integration Tests
 *
 * @see https://github.com/BradGroux/veritas-kanban/issues/52
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../middleware/error-handler.js';

// Mock fs-helpers before importing routes
vi.mock('../../storage/fs-helpers.js', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

const { resetAgentRegistryService } = await import('../../services/agent-registry-service.js');
const { agentRegistryRoutes } = await import('../../routes/agent-registry.js');

describe('Agent Registry Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetAgentRegistryService();

    app = express();
    app.use(express.json());
    app.use('/api/agents', agentRegistryRoutes);
    app.use(errorHandler);
  });

  afterEach(() => {
    resetAgentRegistryService();
  });

  // ── Registration ─────────────────────────────────────────────

  describe('POST /api/agents/register', () => {
    it('should register a new agent (201)', async () => {
      const res = await request(app)
        .post('/api/agents/register')
        .send({
          name: 'claude-main',
          agentType: 'claude-code',
          capabilities: ['code', 'test'],
          model: 'claude-sonnet-4-20250514',
        });

      expect(res.status).toBe(201);
      expect(res.body.isNew).toBe(true);
      expect(res.body.agent.name).toBe('claude-main');
      expect(res.body.agent.agentType).toBe('claude-code');
      expect(res.body.agent.capabilities).toEqual(['code', 'test']);
      expect(res.body.agent.status).toBe('alive');
      expect(res.body.agent.id).toBeDefined();
    });

    it('should re-register an existing agent (200)', async () => {
      await request(app)
        .post('/api/agents/register')
        .send({ name: 'claude-main', agentType: 'claude-code', capabilities: ['code'] });

      const res = await request(app)
        .post('/api/agents/register')
        .send({ name: 'claude-main', agentType: 'claude-code', capabilities: ['code', 'test', 'review'] });

      expect(res.status).toBe(200);
      expect(res.body.isNew).toBe(false);
      expect(res.body.agent.capabilities).toEqual(['code', 'test', 'review']);
    });

    it('should reject invalid agent name', async () => {
      const res = await request(app)
        .post('/api/agents/register')
        .send({ name: 'invalid name!', agentType: 'claude-code', capabilities: ['code'] });

      expect(res.status).toBe(400);
    });

    it('should reject empty capabilities', async () => {
      const res = await request(app)
        .post('/api/agents/register')
        .send({ name: 'test-agent', agentType: 'claude-code', capabilities: [] });

      expect(res.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/agents/register')
        .send({ name: 'test' });

      expect(res.status).toBe(400);
    });
  });

  // ── Heartbeat ────────────────────────────────────────────────

  describe('POST /api/agents/:id/heartbeat', () => {
    it('should update agent status', async () => {
      const reg = await request(app)
        .post('/api/agents/register')
        .send({ name: 'test-agent', agentType: 'claude-code', capabilities: ['code'] });

      const res = await request(app)
        .post(`/api/agents/${reg.body.agent.id}/heartbeat`)
        .send({ status: 'working', taskId: 'TASK-1', taskTitle: 'Fix the bug' });

      expect(res.status).toBe(200);
      expect(res.body.agent.status).toBe('working');
      expect(res.body.agent.activeSession).toBeDefined();
      expect(res.body.agent.activeSession.taskId).toBe('TASK-1');
      expect(res.body.serverTime).toBeDefined();
    });

    it('should return 404 for unknown agent', async () => {
      const res = await request(app)
        .post('/api/agents/nonexistent/heartbeat')
        .send({ status: 'alive' });

      expect(res.status).toBe(404);
    });

    it('should reject invalid status', async () => {
      const reg = await request(app)
        .post('/api/agents/register')
        .send({ name: 'test-agent', agentType: 'claude-code', capabilities: ['code'] });

      const res = await request(app)
        .post(`/api/agents/${reg.body.agent.id}/heartbeat`)
        .send({ status: 'banana' });

      expect(res.status).toBe(400);
    });
  });

  // ── Registry Listing ─────────────────────────────────────────

  describe('GET /api/agents/registry', () => {
    it('should list registered agents', async () => {
      await request(app).post('/api/agents/register').send({ name: 'a1', agentType: 'claude-code', capabilities: ['code'] });
      await request(app).post('/api/agents/register').send({ name: 'a2', agentType: 'copilot', capabilities: ['code', 'review'] });

      const res = await request(app).get('/api/agents/registry');

      expect(res.status).toBe(200);
      expect(res.body.agents).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should filter by status', async () => {
      const reg = await request(app).post('/api/agents/register').send({ name: 'a1', agentType: 'claude-code', capabilities: ['code'] });
      await request(app).post('/api/agents/register').send({ name: 'a2', agentType: 'copilot', capabilities: ['code'] });

      await request(app).post(`/api/agents/${reg.body.agent.id}/heartbeat`).send({ status: 'working', taskId: 'T1' });

      const res = await request(app).get('/api/agents/registry').query({ status: 'working' });

      expect(res.status).toBe(200);
      expect(res.body.agents).toHaveLength(1);
      expect(res.body.agents[0].name).toBe('a1');
    });

    it('should filter by capability', async () => {
      await request(app).post('/api/agents/register').send({ name: 'a1', agentType: 'claude-code', capabilities: ['code', 'deploy'] });
      await request(app).post('/api/agents/register').send({ name: 'a2', agentType: 'copilot', capabilities: ['code'] });

      const res = await request(app).get('/api/agents/registry').query({ capability: 'deploy' });

      expect(res.status).toBe(200);
      expect(res.body.agents).toHaveLength(1);
      expect(res.body.agents[0].name).toBe('a1');
    });
  });

  // ── Single Agent Lookup ──────────────────────────────────────

  describe('GET /api/agents/registry/:id', () => {
    it('should return a single agent', async () => {
      const reg = await request(app).post('/api/agents/register').send({ name: 'test', agentType: 'x', capabilities: ['code'] });

      const res = await request(app).get(`/api/agents/registry/${reg.body.agent.id}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('test');
    });

    it('should return 404 for unknown agent', async () => {
      const res = await request(app).get('/api/agents/registry/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  // ── Session History ──────────────────────────────────────────

  describe('GET /api/agents/registry/:id/sessions', () => {
    it('should return session history', async () => {
      const reg = await request(app).post('/api/agents/register').send({ name: 'test', agentType: 'x', capabilities: ['code'] });
      const agentId = reg.body.agent.id;

      await request(app).post(`/api/agents/${agentId}/heartbeat`).send({ status: 'working', taskId: 'T1', taskTitle: 'My Task' });
      await request(app).post(`/api/agents/${agentId}/heartbeat`).send({ status: 'idle' });

      const res = await request(app).get(`/api/agents/registry/${agentId}/sessions`);

      expect(res.status).toBe(200);
      expect(res.body.agentId).toBe(agentId);
      expect(res.body.sessions).toHaveLength(1);
      expect(res.body.sessions[0].taskId).toBe('T1');
    });

    it('should return 404 for unknown agent', async () => {
      const res = await request(app).get('/api/agents/registry/nonexistent/sessions');
      expect(res.status).toBe(404);
    });
  });

  // ── End Session ──────────────────────────────────────────────

  describe('POST /api/agents/:id/session/end', () => {
    it('should end an active session', async () => {
      const reg = await request(app).post('/api/agents/register').send({ name: 'test', agentType: 'x', capabilities: ['code'] });
      const agentId = reg.body.agent.id;

      await request(app).post(`/api/agents/${agentId}/heartbeat`).send({ status: 'working', taskId: 'T1' });

      const res = await request(app).post(`/api/agents/${agentId}/session/end`).send({ outcome: 'success', summary: 'Done!' });

      expect(res.status).toBe(200);
      expect(res.body.session.taskId).toBe('T1');
      expect(res.body.session.outcome).toBe('success');
      expect(res.body.session.summary).toBe('Done!');
    });

    it('should return 404 if no active session', async () => {
      const reg = await request(app).post('/api/agents/register').send({ name: 'test', agentType: 'x', capabilities: ['code'] });

      const res = await request(app).post(`/api/agents/${reg.body.agent.id}/session/end`).send({});
      expect(res.status).toBe(404);
    });
  });

  // ── Unregister ───────────────────────────────────────────────

  describe('DELETE /api/agents/registry/:id', () => {
    it('should remove an agent', async () => {
      const reg = await request(app).post('/api/agents/register').send({ name: 'test', agentType: 'x', capabilities: ['code'] });

      const res = await request(app).delete(`/api/agents/registry/${reg.body.agent.id}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);

      const check = await request(app).get(`/api/agents/registry/${reg.body.agent.id}`);
      expect(check.status).toBe(404);
    });

    it('should return 404 for unknown agent', async () => {
      const res = await request(app).delete('/api/agents/registry/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
