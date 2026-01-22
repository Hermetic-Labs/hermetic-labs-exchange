import { sampleFlows } from '@/components/flowBuilder/sampleFlows';
import { runFlow } from '@/features/reflex';
import { log } from '@/features/reflex';

function injectComfySource(flowId: string) {
  const flow = sampleFlows.find(f => f.id === flowId);
  if (!flow) return;
  flow.steps.forEach(step => {
    step.payload = { ...step.payload, source: 'plugin:comfy' };
  });
  return flow;
}

export function startComfyBridge() {
  setInterval(async () => {
    const idx = Math.floor(Math.random() * sampleFlows.length);
    const flow = injectComfySource(sampleFlows[idx].id);
    if (flow) {
      log({ verb: 'COMFY_SOCKET', status: 'triggered', payload: { flowId: flow.id }, source: 'plugin:comfy', timestamp: Date.now() });
      await runFlow(flow);
    }
  }, 15000);
}
