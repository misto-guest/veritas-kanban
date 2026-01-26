import { Router, type Router as RouterType } from 'express';
import { ClawdbotAgentService, clawdbotAgentService } from '../services/clawdbot-agent-service.js';
import type { AgentType } from '@veritas-kanban/shared';

const router: RouterType = Router();

// POST /api/agents/:taskId/start - Start agent on task (delegates to Clawdbot)
router.post('/:taskId/start', async (req, res) => {
  try {
    const { agent } = req.body as { agent?: AgentType };
    const status = await clawdbotAgentService.startAgent(req.params.taskId, agent);
    res.status(201).json(status);
  } catch (error: any) {
    console.error('Error starting agent:', error);
    res.status(400).json({ error: error.message || 'Failed to start agent' });
  }
});

// POST /api/agents/:taskId/complete - Callback from Clawdbot when agent finishes
router.post('/:taskId/complete', async (req, res) => {
  try {
    const { success, summary, error } = req.body as { 
      success: boolean; 
      summary?: string; 
      error?: string;
    };
    
    await clawdbotAgentService.completeAgent(req.params.taskId, { success, summary, error });
    res.json({ received: true });
  } catch (error: any) {
    console.error('Error completing agent:', error);
    res.status(400).json({ error: error.message || 'Failed to complete agent' });
  }
});

// POST /api/agents/:taskId/stop - Stop running agent
router.post('/:taskId/stop', async (req, res) => {
  try {
    await clawdbotAgentService.stopAgent(req.params.taskId);
    res.json({ stopped: true });
  } catch (error: any) {
    console.error('Error stopping agent:', error);
    res.status(400).json({ error: error.message || 'Failed to stop agent' });
  }
});

// GET /api/agents/:taskId/status - Get agent status
router.get('/:taskId/status', async (req, res) => {
  try {
    const status = clawdbotAgentService.getAgentStatus(req.params.taskId);
    if (!status) {
      return res.json({ running: false });
    }
    res.json({ running: true, ...status });
  } catch (error: any) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: error.message || 'Failed to get status' });
  }
});

// GET /api/agents/pending - List pending agent requests (for Veritas to poll)
router.get('/pending', async (_req, res) => {
  try {
    const requests = await clawdbotAgentService.listPendingRequests();
    res.json(requests);
  } catch (error: any) {
    console.error('Error listing pending:', error);
    res.status(500).json({ error: error.message || 'Failed to list pending requests' });
  }
});

// GET /api/agents/:taskId/attempts - List attempts for task
router.get('/:taskId/attempts', async (req, res) => {
  try {
    const attempts = await clawdbotAgentService.listAttempts(req.params.taskId);
    res.json(attempts);
  } catch (error: any) {
    console.error('Error listing attempts:', error);
    res.status(500).json({ error: error.message || 'Failed to list attempts' });
  }
});

// GET /api/agents/:taskId/attempts/:attemptId/log - Get attempt log
router.get('/:taskId/attempts/:attemptId/log', async (req, res) => {
  try {
    const log = await clawdbotAgentService.getAttemptLog(req.params.taskId, req.params.attemptId);
    res.type('text/markdown').send(log);
  } catch (error: any) {
    console.error('Error getting log:', error);
    res.status(404).json({ error: error.message || 'Log not found' });
  }
});

// Export service for WebSocket use
export { router as agentRoutes, clawdbotAgentService as agentService };
