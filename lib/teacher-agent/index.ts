/**
 * Agentic Teacher Module
 * Exports all teacher agent functionality
 */

// Types
export * from './types'

// Tools
export {
  teacherTools,
  toolMetadata,
  getToolByName,
  getToolMetadata,
  validateToolInput
} from './tools'

// System Prompt
export { buildSystemPrompt, buildFollowUpPrompt } from './system-prompt'

// Context
export {
  buildAgentContext,
  summarizeContext,
  getDocumentFromContext
} from './context'

// Orchestrator
export {
  orchestrateAgent,
  continueAfterToolExecution
} from './orchestrator'

// Executor
export {
  executeTool,
  updateToolExecutionStatus,
  saveSuggestedAction
} from './executor'
