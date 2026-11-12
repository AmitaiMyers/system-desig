// Settings for one component of the build. Shown in a bottom sheet on phones and docked beside the diagram on desktop.
import type { ReactNode } from 'react';
import type { Feature, Level } from '../../content/types';
import { APP_SIZES, CACHE_NODE, DB_SIZES, EGRESS, LIMITS, LOAD_BALANCER, SIZE_ORDER, WORKER } from '../../engine/catalog';
import { formatMoney } from '../../engine/score';
import type { Build, CdnMode, FailoverMode, SizeId } from '../../engine/types';
import type { NodeId } from '../diagram/nodes';
import { Segmented, Stepper, Switch } from '../primitives/controls';

type SectionProps = { build: Build; level: Level; can: (feature: Feature) => boolean; onChange: (build: Build) => void };

const SIZE_OPTIONS = SIZE_ORDER.map((size) => ({ value: size, label: size }));

function AppSection({ build, can, onChange }: SectionProps) {
  const size = APP_SIZES[build.app.size];
  const setApp = (app: Build['app']) => onChange({ ...build, app });
  return (
    <>
      <p className="help">Stateless web/app servers. Each <b>{build.app.size}</b> server handles <b>{size.rps.toLocaleString()} req/s</b> for <b>${size.monthly}/mo</b>.{build.db.colocated && ' The database lives on this box too, so each gets less than half of it.'}</p>
      {can('appSize') && (
        <Segmented label="Server size (vertical scaling)" value={build.app.size} options={SIZE_OPTIONS} onChange={(value: SizeId) => setApp({ ...build.app, size: value })}
          note={SIZE_ORDER.map((s) => `${s}: ${APP_SIZES[s].rps.toLocaleString()} req/s, $${APP_SIZES[s].monthly}`).join(' · ')} />
      )}
      {can('loadBalancer') && (
        <Stepper label="Number of servers" value={build.loadBalancer ? build.app.count : 1} min={1} max={build.loadBalancer ? LIMITS.maxAppServers : 1} steps={[1, 10]}
          onChange={(count) => setApp({ ...build.app, count })}
          note={build.loadBalancer ? 'Think about what is left when one server dies.' : 'Locked at 1: without a load balancer only one server can receive traffic. Add a load balancer first.'} />
      )}
    </>
  );
}

function LoadBalancerSection({ build, onChange }: SectionProps) {
  return (
    <>
      <p className="help">Spreads requests across your app servers and stops sending traffic to dead ones. ${LOAD_BALANCER.monthly}/mo. It adds no capacity by itself — it lets you use more servers.</p>
      <Switch label="Load balancer" value={build.loadBalancer}
        onChange={(on) => onChange({ ...build, loadBalancer: on, app: { ...build.app, count: on ? build.app.count : 1 } })} />
    </>
  );
}

function CacheSection({ build, level, onChange }: SectionProps) {
  return (
    <>
      <p className="help">In-memory key/value servers in front of the database. Each node answers <b>{CACHE_NODE.opsPerSec.toLocaleString()} lookups/s</b> for <b>${CACHE_NODE.monthly}/mo</b>. In this system <b>{Math.round(level.scenario.workload.cacheableShare * 100)}%</b> of reads are cacheable.</p>
      <Stepper label="Cache nodes" value={build.cache.nodes} min={0} max={LIMITS.maxCacheNodes} steps={[1]} onChange={(nodes) => onChange({ ...build, cache: { nodes } })}
        note="Keys are hashed across nodes. If one node restarts empty, only its share of the cache is lost." />
    </>
  );
}

const FAILOVER_OPTIONS: { value: FailoverMode; label: string }[] = [
  { value: 'none', label: 'none' },
  { value: 'cold', label: 'cold standby' },
  { value: 'hot', label: 'hot standby' },
];

function DatabaseSection({ build, level, can, onChange }: SectionProps) {
  const { db } = build;
  const size = DB_SIZES[db.size];
  const setDb = (next: Partial<Build['db']>) => onChange({ ...build, db: { ...db, ...next } });
  const shardKeys = level.scenario.workload.shardKeys;
  const selectedKey = shardKeys.find((k) => k.id === db.shardKey);
  return (
    <>
      {can('splitDb') && (
        <Switch label="Dedicated database server" value={!db.colocated} onChange={(dedicated) => setDb({ colocated: !dedicated })}
          note="Off: the database shares the app server’s CPU and memory." />
      )}
      {db.colocated ? (
        <p className="help">The database currently runs on the app server. Its capacity follows that server’s size.</p>
      ) : (
        <>
          <p className="help">Each <b>{db.size}</b> node: <b>{size.readsPerSec.toLocaleString()} reads/s</b>, <b>{size.writesPerSec.toLocaleString()} writes/s</b>, <b>${size.monthly}/mo</b>. All writes go to a primary.</p>
          {can('dbSize') && (
            <Segmented label="Node size" value={db.size} options={SIZE_OPTIONS} onChange={(value: SizeId) => setDb({ size: value })}
              note={SIZE_ORDER.map((s) => `${s}: ${DB_SIZES[s].writesPerSec.toLocaleString()} w/s, $${DB_SIZES[s].monthly}`).join(' · ')} />
          )}
          {can('replicas') && (
            <Stepper label={db.shards > 1 ? 'Read replicas per shard' : 'Read replicas'} value={db.replicas} min={0} max={LIMITS.maxReplicas} steps={[1]} onChange={(replicas) => setDb({ replicas })}
              note="Replicas answer reads (the primary then only takes writes). One can be promoted in ~5 minutes if the primary dies, losing a few seconds of writes." />
          )}
          {can('failover') && (
            <Segmented label="Standby for the primary" value={db.failover} options={FAILOVER_OPTIONS} onChange={(failover: FailoverMode) => setDb({ failover })}
              note="Cold: restore from backup — 30 min down, hours of data lost, cheap. Hot: every write goes to two nodes — no downtime, no loss, one extra node, slower writes." />
          )}
          {can('shards') && (
            <Stepper label="Shards (each has its own primary)" value={db.shards} min={1} max={LIMITS.maxShards} steps={[1, 4]} onChange={(shards) => setDb({ shards })}
              note="Write capacity = shards × one primary. Replicas and standbys are per shard." />
          )}
          {can('shards') && shardKeys.length > 1 && (
            <Segmented label="Shard key" value={db.shardKey} options={shardKeys.map((k) => ({ value: k.id, label: k.label }))} onChange={(shardKey: string) => setDb({ shardKey })}
              note={selectedKey !== undefined ? selectedKey.note : 'Pick how rows are assigned to shards.'} />
          )}
          {can('shards') && shardKeys.length === 1 && <p className="help">Shard key: <b>{shardKeys[0].label}</b>. {shardKeys[0].note}</p>}
        </>
      )}
    </>
  );
}

function CdnSection({ build, level, can, onChange }: SectionProps) {
  const options: { value: CdnMode; label: string }[] = [
    { value: 'none', label: 'none' },
    { value: 'commercial', label: 'commercial' },
    ...(can('ownCdn') ? [{ value: 'own' as const, label: 'build our own' }] : []),
  ];
  return (
    <>
      <p className="help">Serves static content from the edge, close to users. Here <b>{Math.round(level.scenario.workload.staticShare * 100)}%</b> of requests are static, about <b>{level.scenario.workload.staticKb.toLocaleString()} KB</b> each.</p>
      <Segmented label="CDN" value={build.cdn} options={options} onChange={(cdn: CdnMode) => onChange({ ...build, cdn })}
        note={`Bandwidth per GB — from your origin: $${EGRESS.originPerGb} · commercial CDN: $${EGRESS.commercialCdnPerGb}${can('ownCdn') ? ` · own appliances: $${EGRESS.ownCdnPerGb} plus ${formatMoney(EGRESS.ownCdnFixedMonthly)}/mo fixed` : ''}. A CDN answers ~95% of static requests itself.`} />
    </>
  );
}

function ObjectStorageSection({ build, level, onChange }: SectionProps) {
  return (
    <>
      <p className="help">S3-style storage for images and video ({level.scenario.workload.dataGb.toLocaleString()} GB here). When on, static files that miss the CDN are served by the storage service instead of your app servers.</p>
      <Switch label="Object storage" value={build.objectStorage} onChange={(objectStorage) => onChange({ ...build, objectStorage })} />
    </>
  );
}

function QueueSection({ build, level, onChange }: SectionProps) {
  const { jobShare, jobCost } = level.scenario.workload;
  const jobsPerWorker = WORKER.unitsPerSec / jobCost;
  return (
    <>
      <p className="help"><b>{Math.round(jobShare * 100)}%</b> of writes trigger background work costing as much as <b>{jobCost.toLocaleString()}</b> normal requests. With a queue, the request returns immediately and workers do the job later. One worker (${WORKER.monthly}/mo) finishes <b>{jobsPerWorker >= 1 ? Math.round(jobsPerWorker).toLocaleString() : jobsPerWorker.toFixed(2)} jobs/s</b>.</p>
      <Switch label="Message queue" value={build.queue.enabled} onChange={(enabled) => onChange({ ...build, queue: { ...build.queue, enabled } })}
        note="Off: jobs run inside the request, on the app servers, while the user waits." />
      {build.queue.enabled && (
        <Stepper label="Workers" value={build.queue.workers} min={0} max={LIMITS.maxWorkers} steps={[1, 10, 100]} onChange={(workers) => onChange({ ...build, queue: { ...build.queue, workers } })}
          note="Too few workers and the backlog grows; the level limits how late a job may be." />
      )}
    </>
  );
}

function RegionsSection({ build, level, onChange }: SectionProps) {
  const [first, second, third] = level.scenario.workload.geo.map((share) => `${Math.round(share * 100)}%`);
  return (
    <>
      <p className="help">Users: <b>{first}</b> in region 1, <b>{second}</b> in region 2, <b>{third}</b> in region 3. Users without a nearby region pay +100 ms per request.</p>
      <Stepper label="Regions deployed" value={build.regions} min={1} max={LIMITS.maxRegions} steps={[1]} onChange={(regions) => onChange({ ...build, regions })}
        note="Each region runs a full copy of everything below: all counts and costs are per region. When you add regions, shrink each copy." />
    </>
  );
}

const SECTIONS: Record<NodeId, { title: string; render: (props: SectionProps) => ReactNode }> = {
  app: { title: 'App servers', render: AppSection },
  loadBalancer: { title: 'Load balancer', render: LoadBalancerSection },
  cache: { title: 'Cache', render: CacheSection },
  db: { title: 'Database', render: DatabaseSection },
  cdn: { title: 'CDN', render: CdnSection },
  objectStorage: { title: 'Object storage', render: ObjectStorageSection },
  queue: { title: 'Queue + workers', render: QueueSection },
  regions: { title: 'Regions', render: RegionsSection },
};

export function inspectorTitle(nodeId: NodeId): string {
  return SECTIONS[nodeId].title;
}

export function InspectorBody({ nodeId, build, level, onChange }: { nodeId: NodeId; build: Build; level: Level; onChange: (build: Build) => void }) {
  const Section = SECTIONS[nodeId].render;
  return <Section build={build} level={level} can={(feature) => level.unlocked.includes(feature)} onChange={onChange} />;
}
