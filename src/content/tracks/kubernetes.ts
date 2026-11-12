import { box, edge, lesson, q, state, store, type Lesson } from '../lesson';

const SOURCE = 'Kubernetes documentation (kubernetes.io)';

export const KUBERNETES_LESSONS: Lesson[] = [
  lesson({
    id: 'k8s-architecture',
    title: 'Cluster architecture and the control loop',
    summary: 'You declare what you want; controllers keep making reality match it.',
    paragraphs: [
      'A cluster has a control plane and worker nodes. The API server is the only component everything talks to. etcd stores the cluster’s state. The scheduler picks a node for each new pod. The controller manager runs the control loops.',
      'On every node, the kubelet starts and watches the containers it is told to run, the container runtime runs them, and kube-proxy programs the network rules for Services.',
      'The core idea is declarative: you submit the desired state (“three replicas of this image”) and controllers continuously compare it with the actual state and act on the difference. Nothing is a one-off command — if a pod dies, the loop notices the gap and creates another.',
    ],
    states: [
      state('Components', 'kubectl talks to the API server. State lives in etcd. Scheduler and controllers watch the API; kubelets run the pods.', [box('api', 'API server', 1, 0, { tone: 'info' }), store('etcd', 'etcd', 0, 0, { sub: 'cluster state' }), box('ctl', 'Scheduler + controllers', 2, 0), box('n1', 'Node: kubelet', 0, 1, { sub: 'runs pods', tone: 'good' }), box('n2', 'Node: kubelet', 2, 1, { sub: 'runs pods', tone: 'good' })], [edge('api', 'etcd'), edge('ctl', 'api'), edge('api', 'n1'), edge('api', 'n2')]),
      state('Reconcile', 'Desired: 3 pods. Actual: 2. The controller sees the difference and creates one — that is the whole mechanism.', [box('want', 'Desired: 3 replicas', 0, 0, { tone: 'info' }), box('ctl', 'Controller', 1, 0, { sub: 'compare, act' }), box('have', 'Actual: 2 pods', 2, 0, { tone: 'warn' }), box('new', 'Create 1 pod', 1, 1, { tone: 'good' })], [edge('want', 'ctl'), edge('have', 'ctl'), edge('ctl', 'new', { tone: 'good' })]),
    ],
    card: {
      points: ['Control plane: API server, etcd, scheduler, controller manager.', 'Node: kubelet, container runtime, kube-proxy.', 'Declarative: controllers reconcile actual state towards desired state, forever.'],
      insight: 'Stop thinking in commands and start thinking in desired state. Almost every Kubernetes behaviour is “a controller noticed a difference”.',
      source: SOURCE,
    },
    quiz: [
      q('Where is the cluster’s state stored?', ['In the kubelet', 'In etcd', 'In the scheduler', 'In each pod'], 1, 'etcd is the consistent key/value store behind the API server.'),
      q('A pod crashes. What brings it back?', ['An admin re-runs kubectl', 'A controller sees actual ≠ desired and creates a replacement', 'The pod restarts itself on another node', 'etcd restores it from backup'], 1, 'Reconciliation: the ReplicaSet controller keeps the declared number of pods running.'),
    ],
  }),
  lesson({
    id: 'k8s-workloads',
    title: 'Pods, Deployments and rolling updates',
    summary: 'The smallest unit, the thing that keeps N of them alive, and how to change versions without downtime.',
    paragraphs: [
      'A pod is one or more containers that share a network address and storage and are always scheduled together. Pods are disposable: they are replaced, never repaired, and a replacement gets a new IP.',
      'You rarely create pods directly. A Deployment declares a pod template and a replica count; underneath, a ReplicaSet keeps that many pods running.',
      'Changing the template (a new image, for example) starts a rolling update: a new ReplicaSet is scaled up while the old one is scaled down, a few pods at a time, and traffic only goes to new pods once they report ready. If the new version never becomes ready the rollout stalls instead of taking the service down, and you can roll back to the previous ReplicaSet.',
    ],
    states: [
      state('Steady', 'A Deployment keeps three v1 pods running through its ReplicaSet.', [box('d', 'Deployment', 1, 0, { sub: 'replicas: 3', tone: 'info' }), box('p1', 'Pod v1', 0, 1, { tone: 'good' }), box('p2', 'Pod v1', 1, 1, { tone: 'good' }), box('p3', 'Pod v1', 2, 1, { tone: 'good' })], [edge('d', 'p1'), edge('d', 'p2'), edge('d', 'p3')]),
      state('Rolling update', 'A v2 pod is started; once it is ready, one v1 pod is removed. Capacity never drops to zero.', [box('d', 'Deployment', 1, 0, { sub: 'image: v2', tone: 'info' }), box('p1', 'Pod v2', 0, 1, { sub: 'ready', tone: 'good' }), box('p2', 'Pod v1', 1, 1, { tone: 'plain' }), box('p3', 'Pod v1', 2, 1, { sub: 'terminating', tone: 'warn' })], [edge('d', 'p1'), edge('d', 'p2'), edge('d', 'p3', { dashed: true })]),
      state('Bad release', 'v2 never passes its readiness check. The rollout stops with v1 pods still serving — then you roll back.', [box('d', 'Deployment', 1, 0, { sub: 'rollout stalled', tone: 'warn' }), box('p1', 'Pod v2', 0, 1, { sub: 'not ready', tone: 'bad' }), box('p2', 'Pod v1', 1, 1, { sub: 'serving', tone: 'good' }), box('p3', 'Pod v1', 2, 1, { sub: 'serving', tone: 'good' })], [edge('d', 'p1', { dashed: true, tone: 'bad' }), edge('d', 'p2'), edge('d', 'p3')]),
    ],
    card: {
      points: ['Pod: co-scheduled containers sharing network and storage; disposable.', 'Deployment → ReplicaSet → pods; the ReplicaSet maintains the count.', 'Rolling update replaces pods gradually, gated by readiness; rollback returns to the old ReplicaSet.'],
      insight: 'Zero-downtime deploys depend on an honest readiness probe. If “ready” means “process started”, a rolling update will happily route traffic to a broken version.',
      source: SOURCE,
    },
    quiz: [
      q('What keeps the declared number of pods running?', ['The Service', 'The ReplicaSet created by the Deployment', 'The Ingress', 'kubectl'], 1, 'The Deployment manages ReplicaSets; a ReplicaSet maintains the pod count.'),
      q('During a rolling update, when does a new pod start receiving traffic?', ['As soon as it is created', 'When its readiness probe passes', 'After all old pods are gone', 'After one minute'], 1, 'Only ready pods are added to the Service’s endpoints.'),
    ],
  }),
  lesson({
    id: 'k8s-networking',
    title: 'Services and Ingress',
    summary: 'A stable address in front of pods that keep changing, and one HTTP entrance for the cluster.',
    paragraphs: [
      'Pod IPs change every time a pod is replaced, so nothing should talk to a pod directly. A Service gives a set of pods (chosen by label) one stable virtual IP and DNS name, and load-balances across the pods that are ready.',
      'ClusterIP, the default, is reachable only inside the cluster. NodePort opens a port on every node. LoadBalancer asks the cloud provider for an external load balancer. Inside the cluster, services find each other by DNS name, for example payments.shop.svc.cluster.local.',
      'An Ingress is HTTP-level routing in front of Services: one external entry point that routes by host name and path and usually terminates TLS. It needs an ingress controller (such as NGINX or a cloud one) to do the actual work.',
    ],
    states: [
      state('Service', 'The Service has a fixed address; behind it, pods come and go and only ready ones get traffic.', [box('c', 'Other pod', 0, 0), box('s', 'Service: payments', 1, 0, { sub: 'stable IP + DNS', tone: 'info' }), box('p1', 'Pod', 0, 1, { tone: 'good' }), box('p2', 'Pod', 1, 1, { tone: 'good' }), box('p3', 'Pod (not ready)', 2, 1, { tone: 'muted' })], [edge('c', 's'), edge('s', 'p1'), edge('s', 'p2')]),
      state('Ingress', 'One external entrance: the Ingress routes by host and path to the right Service.', [box('u', 'Internet', 1, 0), box('i', 'Ingress', 1, 1, { sub: 'TLS, host/path rules', tone: 'info' }), box('s1', 'Service: web', 0, 2, { sub: '/', tone: 'good' }), box('s2', 'Service: api', 2, 2, { sub: '/api', tone: 'good' })], [edge('u', 'i'), edge('i', 's1'), edge('i', 's2')]),
    ],
    card: {
      points: ['Service: stable IP and DNS name for a label-selected set of ready pods.', 'Types: ClusterIP (internal), NodePort, LoadBalancer (cloud LB).', 'Ingress: HTTP routing by host/path with TLS, implemented by an ingress controller.'],
      insight: 'A Service selects pods by label — so a typo in a label silently gives you a Service with no endpoints. Check the endpoints first when “nothing answers”.',
      source: SOURCE,
    },
    quiz: [
      q('Why not call a pod by its IP?', ['Pod IPs are slow', 'A replaced pod gets a new IP; the Service address stays stable', 'Pods have no IPs', 'It is forbidden by the API server'], 1, 'Pods are disposable. The Service is the stable identity.'),
      q('Which Service type is reachable only from inside the cluster?', ['LoadBalancer', 'NodePort', 'ClusterIP', 'Ingress'], 2, 'ClusterIP is the default and is internal only.'),
    ],
  }),
  lesson({
    id: 'k8s-config-storage',
    title: 'Configuration, storage and stateful apps',
    summary: 'Keeping config out of images, data out of pods, and identity stable where it matters.',
    paragraphs: [
      'ConfigMaps hold configuration and Secrets hold sensitive values; both are injected into pods as environment variables or files. The same image can then run unchanged in every environment. Note that Secrets are only base64-encoded by default — enable encryption at rest and restrict who can read them.',
      'A container’s filesystem disappears with the pod. For data that must survive, a pod claims storage with a PersistentVolumeClaim, which is bound to a PersistentVolume — typically a cloud disk provisioned on demand through a StorageClass.',
      'Deployments treat pods as interchangeable, which is wrong for databases. A StatefulSet gives each pod a stable name (db-0, db-1), its own persistent volume that follows it across restarts, and ordered start-up. Many teams still prefer a managed database outside the cluster.',
    ],
    states: [
      state('Config', 'One image, different ConfigMaps and Secrets per environment, mounted at start-up.', [box('cm', 'ConfigMap', 0, 0, { sub: 'settings' }), box('sec', 'Secret', 2, 0, { sub: 'passwords, keys', tone: 'warn' }), box('pod', 'Pod', 1, 1, { sub: 'env vars / files', tone: 'good' })], [edge('cm', 'pod'), edge('sec', 'pod')]),
      state('Storage', 'The pod claims storage; the claim binds to a volume that outlives the pod.', [box('pod', 'Pod', 0, 0, { tone: 'good' }), box('pvc', 'Volume claim', 1, 0, { sub: '“10 GB, fast”', tone: 'info' }), store('pv', 'Volume', 2, 0, { sub: 'cloud disk' })], [edge('pod', 'pvc'), edge('pvc', 'pv')]),
      state('StatefulSet', 'Each replica keeps its name and its own disk across restarts: db-0 always gets volume 0.', [box('p0', 'db-0', 0, 0, { tone: 'good' }), box('p1', 'db-1', 1, 0, { tone: 'good' }), box('p2', 'db-2', 2, 0, { tone: 'good' }), store('v0', 'Volume 0', 0, 1), store('v1', 'Volume 1', 1, 1), store('v2', 'Volume 2', 2, 1)], [edge('p0', 'v0'), edge('p1', 'v1'), edge('p2', 'v2')]),
    ],
    card: {
      points: ['ConfigMap and Secret inject configuration; Secrets need encryption at rest and tight RBAC.', 'PersistentVolumeClaim → PersistentVolume, provisioned through a StorageClass.', 'StatefulSet: stable pod names, one volume per pod, ordered rollout.'],
      insight: 'Kubernetes can run databases, but it does not operate them for you. Unless you need it, a managed database is usually the cheaper kind of responsibility.',
      source: SOURCE,
    },
    quiz: [
      q('What happens to files written inside a container when the pod is replaced?', ['They move to the new pod', 'They are lost unless they were on a persistent volume', 'They are saved in etcd', 'They are copied to the ConfigMap'], 1, 'The container filesystem is ephemeral.'),
      q('Which workload type gives each replica a stable name and its own disk?', ['Deployment', 'DaemonSet', 'StatefulSet', 'Job'], 2, 'StatefulSets provide stable identity and per-pod storage.'),
    ],
  }),
  lesson({
    id: 'k8s-scaling',
    title: 'Resources, probes and autoscaling',
    summary: 'Tell the scheduler what a pod needs, tell the kubelet when it is healthy, and let the cluster scale.',
    paragraphs: [
      'Each container declares requests and limits for CPU and memory. Requests are what the scheduler reserves when choosing a node. Limits are the ceiling: CPU above the limit is throttled, memory above the limit gets the container killed (OOMKilled). Pods with no requests are the first to be evicted when a node runs short.',
      'Probes tell Kubernetes about health. A liveness probe that fails gets the container restarted. A readiness probe that fails removes the pod from Service endpoints without restarting it — the right response to “temporarily cannot serve”. A startup probe protects slow-starting apps from being killed too early.',
      'The Horizontal Pod Autoscaler changes the replica count to hold a target such as 60% average CPU, measured relative to requests. When pods no longer fit on the existing nodes, a cluster autoscaler adds nodes.',
    ],
    states: [
      state('Probes', 'Readiness failing: the pod stays alive but receives no traffic. Liveness failing: the container is restarted.', [box('s', 'Service', 1, 0, { tone: 'info' }), box('p1', 'Pod: ready', 0, 1, { sub: 'gets traffic', tone: 'good' }), box('p2', 'Pod: not ready', 1, 1, { sub: 'no traffic', tone: 'warn' }), box('p3', 'Pod: liveness ✕', 2, 1, { sub: 'restarted', tone: 'bad' })], [edge('s', 'p1', { tone: 'good' })]),
      state('Autoscale', 'Average CPU is above the 60% target, so the autoscaler raises replicas from 2 to 4.', [box('hpa', 'Autoscaler', 1, 0, { sub: 'target 60% CPU', tone: 'info' }), box('p1', 'Pod 90%', 0, 1, { tone: 'warn' }), box('p2', 'Pod 85%', 1, 1, { tone: 'warn' }), box('p3', '+2 new pods', 2, 1, { tone: 'good' })], [edge('hpa', 'p3', { tone: 'good' })]),
      state('Memory limit', 'The container exceeds its memory limit and is killed and restarted. CPU over the limit would only be throttled.', [box('p', 'Container', 1, 0, { sub: 'limit 512 MB, uses 600', tone: 'bad' }), box('k', 'OOMKilled → restart', 1, 1, { tone: 'warn' })], [edge('p', 'k', { tone: 'bad' })]),
    ],
    card: {
      points: ['Requests drive scheduling; limits cap usage (CPU throttled, memory OOM-killed).', 'Liveness → restart. Readiness → stop sending traffic. Startup → wait for slow boots.', 'HPA scales replicas on metrics relative to requests; the cluster autoscaler adds nodes.'],
      insight: 'A liveness probe that checks a dependency turns that dependency’s outage into a restart storm of your own pods. Liveness should test only the process itself.',
      source: SOURCE,
    },
    quiz: [
      q('A pod is temporarily overloaded and cannot serve. Which probe should fail?', ['Liveness', 'Readiness', 'Startup', 'None'], 1, 'Readiness removes it from the load balancer without killing it.'),
      q('A container uses more memory than its limit. What happens?', ['It is throttled', 'It is killed (OOMKilled) and restarted', 'The limit grows automatically', 'The node shuts down'], 1, 'Memory cannot be throttled, so the container is terminated.'),
    ],
  }),
];
