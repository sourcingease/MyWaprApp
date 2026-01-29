const { agentModules } = require('../src/agents-config');
const { buildAgentGraph } = require('../src/multi-agent');

async function main() {
  const { moduleSupervisors } = buildAgentGraph(agentModules);
  const supervisor = moduleSupervisors.get('accounting');
  if (!supervisor) {
    console.error('Accounting module not found in agentModules');
    process.exit(1);
  }

  const samples = [
    'Paid rent in cash',
    'Paid salary in cash',
    'Received commission in bank',
    'Received interest in bank',
    'Bought machinery for cash',
    'Sold goods for cash'
  ];

  for (const text of samples) {
    const history = [{ role: 'user', content: text }];
    const ctx = { moduleId: 'accounting', tabId: 'dashboard', userId: null, tenantId: null };
    const reply = await supervisor.handleMessage(history, ctx);
    console.log('----------------------------------------');
    console.log('Input :', text);
    console.log('Output:');
    console.log(reply.text);
  }
}

main().catch(err => {
  console.error('Error running accounting agent demo:', err);
  process.exit(1);
});