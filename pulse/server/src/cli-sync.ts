import { syncAll } from './fub/sync';

/** One-shot sync runner — handy for cron jobs: `npm run sync`. */
syncAll()
  .then((result) => {
    console.log(`Sync complete — ${result.agents} agents, ${result.calls} calls updated.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Sync failed:', String((err as Error)?.message ?? err));
    process.exit(1);
  });
