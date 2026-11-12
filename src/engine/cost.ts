import {
  APP_SIZES,
  CACHE_NODE,
  COLD_BACKUP,
  DB_SIZES,
  EGRESS,
  GEO_ROUTING,
  LOAD_BALANCER,
  OBJECT_STORAGE,
  QUEUE,
  WORKER,
} from './catalog';
import type { Build, CostLine, Workload } from './types';

export type MonthlyEgress = { cdnGb: number; originGb: number };

/** Monthly infrastructure cost that does not depend on traffic. */
export function fixedCostLines(build: Build, workload: Workload): CostLine[] {
  const { regions, db } = build;
  const dbNodesPerShard = 1 + db.replicas + (db.failover === 'hot' ? 1 : 0);
  const lines: CostLine[] = [
    { id: 'app', label: 'App servers', monthly: build.app.count * APP_SIZES[build.app.size].monthly * regions },
    { id: 'db', label: 'Database nodes', monthly: db.colocated ? 0 : db.shards * dbNodesPerShard * DB_SIZES[db.size].monthly * regions },
    { id: 'backup', label: 'Cold backups', monthly: db.failover === 'cold' ? db.shards * COLD_BACKUP.monthlyPerShard : 0 },
    { id: 'cache', label: 'Cache nodes', monthly: build.cache.nodes * CACHE_NODE.monthly * regions },
    { id: 'loadBalancer', label: 'Load balancer', monthly: build.loadBalancer ? LOAD_BALANCER.monthly * regions : 0 },
    { id: 'queue', label: 'Message queue', monthly: build.queue.enabled ? QUEUE.monthly : 0 },
    { id: 'workers', label: 'Workers', monthly: build.queue.enabled ? build.queue.workers * WORKER.monthly * regions : 0 },
    { id: 'objectStorage', label: 'Object storage', monthly: build.objectStorage ? workload.dataGb * OBJECT_STORAGE.monthlyPerGb : 0 },
    { id: 'geoRouting', label: 'Geo-routing', monthly: regions > 1 ? GEO_ROUTING.monthly : 0 },
    { id: 'ownCdn', label: 'Own CDN appliances', monthly: build.cdn === 'own' ? EGRESS.ownCdnFixedMonthly : 0 },
  ];
  return lines;
}

export function fixedCost(build: Build, workload: Workload): number {
  return fixedCostLines(build, workload).reduce((sum, line) => sum + line.monthly, 0);
}

export function computeCost(build: Build, workload: Workload, egress: MonthlyEgress): { lines: CostLine[]; total: number } {
  const cdnPerGb = build.cdn === 'own' ? EGRESS.ownCdnPerGb : EGRESS.commercialCdnPerGb;
  const lines = [
    ...fixedCostLines(build, workload),
    { id: 'originEgress', label: 'Bandwidth from origin', monthly: egress.originGb * EGRESS.originPerGb },
    { id: 'cdnEgress', label: 'Bandwidth via CDN', monthly: egress.cdnGb * cdnPerGb },
  ].filter((line) => line.monthly > 0);
  return { lines, total: lines.reduce((sum, line) => sum + line.monthly, 0) };
}
