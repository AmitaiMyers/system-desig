// Static diagrams: architectures and flows that are read, not operated.
import { Arrow, Box, Cyl, Frame, Note } from './kit';

export function ReplicationFigure() {
  return (
    <Frame height={150} label="The app writes to the primary and reads from a replica. The replica receives changes a few seconds late.">
      <Box x={118} y={6} label="App" />
      <Cyl x={36} y={84} w={90} label="Primary" sub="all writes" tone="info" />
      <Cyl x={194} y={84} w={90} label="Replica" sub="reads" tone="good" />
      <Arrow x1={140} y1={44} x2={92} y2={84} label="write" />
      <Arrow x1={180} y1={44} x2={232} y2={84} label="read" />
      <Arrow x1={126} y1={110} x2={194} y2={110} dashed tone="warn" />
      <Note x={160} y={144} anchor="middle" tone="warn" text="replication: a few seconds behind" />
    </Frame>
  );
}

export function DenormalizeFigure() {
  return (
    <div className="fig-tables" role="img" aria-label="Normalized data keeps reservations and customers in two tables linked by customer ID. Denormalized data repeats the customer's name and phone in every reservation row.">
      <p className="fig-caption">Normalized — two lookups, update in one place</p>
      <div className="fig-table-row">
        <table><thead><tr><th>Res.</th><th>Cust. ID</th><th>Time</th></tr></thead><tbody><tr><td>1</td><td>123</td><td>6:30</td></tr><tr><td>2</td><td>451</td><td>7:00</td></tr><tr><td>3</td><td>123</td><td>8:00</td></tr></tbody></table>
        <table><thead><tr><th>Cust. ID</th><th>Name</th><th>Phone</th></tr></thead><tbody><tr><td>123</td><td>Frank</td><td>555-1234</td></tr><tr><td>451</td><td>John</td><td>555-5233</td></tr></tbody></table>
      </div>
      <p className="fig-caption">Denormalized — one lookup, the same fact stored many times</p>
      <table><thead><tr><th>Res.</th><th>Name</th><th>Phone</th><th>Time</th></tr></thead><tbody><tr><td>1</td><td>Frank</td><td>555-1234</td><td>6:30</td></tr><tr><td>2</td><td>John</td><td>555-5233</td><td>7:00</td></tr><tr><td>3</td><td>Frank</td><td>555-1234</td><td>8:00</td></tr></tbody></table>
    </div>
  );
}

export function ObjectStorageFigure() {
  return (
    <Frame height={150} label="The web server stores a file's metadata and location in the database, and the file itself in object storage.">
      <Box x={118} y={6} label="Web server" sub="stateless" />
      <Cyl x={20} y={84} w={124} label="Database" sub="metadata + location" tone="info" />
      <Cyl x={176} y={84} w={124} label="Object storage" sub="the files themselves" tone="good" />
      <Arrow x1={140} y1={44} x2={92} y2={84} />
      <Arrow x1={180} y1={44} x2={232} y2={84} />
    </Frame>
  );
}

export function QueueFigure() {
  return (
    <Frame height={104} label="Producers put messages on a queue and return immediately. Workers take messages off the queue and do the work later.">
      <Box x={4} y={24} w={86} label="Web servers" sub="producers" />
      <Box x={117} y={24} w={86} label="Queue" sub="messages wait" tone="info" />
      <Box x={230} y={24} w={86} label="Workers" sub="consumers" tone="good" />
      <Arrow x1={90} y1={43} x2={117} y2={43} />
      <Arrow x1={203} y1={43} x2={230} y2={43} />
      <Note x={47} y={84} anchor="middle" tone="good" text="user gets a reply here" />
      <Note x={273} y={84} anchor="middle" text="work finishes later" />
    </Frame>
  );
}

export function UploadPipelineFigure() {
  return (
    <Frame height={176} label="Upload stores raw video and publishes a message. A transcoding fleet reads the queue and writes renditions to object storage, and popular videos go to the CDN.">
      <Box x={4} y={10} w={78} label="Upload" sub="web servers" />
      <Cyl x={118} y={4} w={84} label="Raw video" sub="object storage" />
      <Box x={236} y={10} w={80} label="Queue" tone="info" />
      <Arrow x1={82} y1={29} x2={118} y2={29} />
      <Arrow x1={202} y1={29} x2={236} y2={29} />
      <Arrow x1={276} y1={48} x2={276} y2={96} label="jobs" />
      <Box x={216} y={96} w={100} label="Transcoding" sub="worker fleet" tone="good" />
      <Cyl x={104} y={90} w={84} label="Renditions" sub="240p … 4K" />
      <Box x={4} y={96} w={72} label="CDN" sub="popular only" tone="info" />
      <Arrow x1={216} y1={115} x2={188} y2={115} />
      <Arrow x1={104} y1={115} x2={76} y2={115} />
      <Note x={160} y={166} anchor="middle" text="when transcoding completes, the metadata DB marks the video ready" />
    </Frame>
  );
}

export function BlastRadiusFigure() {
  return (
    <Frame height={170} label="Failures nest: a server sits in a rack, in a data center or availability zone, in a region. A replica only helps if it is outside the part that failed.">
      <rect className="fig-zone" x={4} y={4} width={312} height={162} rx={10} />
      <Note x={14} y={20} text="Region" strong />
      <rect className="fig-zone" x={14} y={28} width={186} height={130} rx={10} />
      <Note x={24} y={44} text="Data center (zone A)" strong />
      <rect className="fig-zone" x={24} y={52} width={110} height={98} rx={10} />
      <Note x={34} y={68} text="Rack" strong />
      <Box x={36} y={84} w={86} h={50} label="Server" sub="primary" tone="bad" />
      <rect className="fig-zone" x={210} y={28} width={96} height={130} rx={10} />
      <Note x={220} y={44} text="Zone B" strong />
      <Box x={218} y={84} w={80} h={50} label="Replica" sub="survives" tone="good" />
    </Frame>
  );
}

export function InterviewFlowFigure() {
  return (
    <Frame height={124} label="The five steps of a system design interview: clarify the requirements, estimate the scale, sketch a high-level design, deep-dive into one part, and defend the design.">
      <Box x={4} y={8} w={92} label="1 Clarify" sub="who, what, scope" tone="info" />
      <Box x={114} y={8} w={92} label="2 Estimate" sub="order of magnitude" tone="info" />
      <Box x={224} y={8} w={92} label="3 Sketch" sub="high level first" tone="info" />
      <Arrow x1={96} y1={27} x2={114} y2={27} />
      <Arrow x1={206} y1={27} x2={224} y2={27} />
      <Arrow x1={270} y1={46} x2={224} y2={78} />
      <Box x={132} y={76} w={92} label="4 Deep dive" sub="scale, failures" tone="info" />
      <Box x={22} y={76} w={92} label="5 Defend" sub="take feedback" tone="good" />
      <Arrow x1={132} y1={95} x2={114} y2={95} />
    </Frame>
  );
}

export function UrlShortenerFigure() {
  const center = 118;
  return (
    <Frame height={246} label="A redirect request goes through a load balancer to stateless web servers, which check a cache and fall back to a sharded key-value store mapping short codes to long URLs.">
      <Box x={center} y={4} h={32} label="GET /abc123" tone="info" />
      <Arrow x1={160} y1={36} x2={160} y2={52} />
      <Box x={center} y={52} h={32} label="Load balancer" />
      <Arrow x1={160} y1={84} x2={160} y2={100} />
      <Box x={center - 16} y={100} w={116} h={32} label="Web servers × N" tone="good" />
      <Note x={244} y={120} text="stateless" />
      <Arrow x1={160} y1={132} x2={160} y2={148} />
      <Box x={center} y={148} h={32} label="Cache" tone="good" />
      <Note x={212} y={168} text="95% of reads stop here" />
      <Arrow x1={160} y1={180} x2={160} y2={196} label="miss" />
      <Cyl x={center - 16} y={196} w={116} label="Key/value store" sub="short → long URL" />
    </Frame>
  );
}

export function ReservationFigure() {
  return (
    <Frame height={206} label="Web servers read availability through a cache and write bookings to a primary database that is synchronously copied to a hot standby. Confirmation messages go through a queue to SMS workers.">
      <Box x={118} y={4} label="Load balancer" />
      <Arrow x1={160} y1={42} x2={160} y2={56} />
      <Box x={118} y={56} label="Web servers" sub="stateless" tone="good" />
      <Arrow x1={202} y1={75} x2={232} y2={75} />
      <Box x={232} y={56} label="Queue" sub="SMS jobs" tone="info" />
      <Arrow x1={274} y1={94} x2={274} y2={108} />
      <Box x={232} y={108} label="SMS workers" />
      <Arrow x1={160} y1={94} x2={160} y2={108} />
      <Box x={118} y={108} label="Cache" sub="availability" tone="good" />
      <Arrow x1={150} y1={146} x2={108} y2={160} label="book" />
      <Cyl x={50} y={156} w={96} label="Primary" sub="bookings" tone="info" />
      <Arrow x1={146} y1={180} x2={186} y2={180} tone="good" label="sync" />
      <Cyl x={186} y={156} w={104} label="Hot standby" sub="has every booking" tone="good" />
    </Frame>
  );
}

export function CrawlerFigure() {
  return (
    <Frame height={172} label="A queue of URLs feeds page downloaders hashed by domain. Pages and their content hashes are stored. Extracted URLs are normalized, filtered and fed back into the queue.">
      <Box x={232} y={4} label="URL filter" sub="stop-list" />
      <Arrow x1={232} y1={26} x2={62} y2={66} dashed tone="info" label="new URLs" />
      <Box x={4} y={66} label="URL queue" sub="breadth-first" tone="info" />
      <Arrow x1={88} y1={85} x2={118} y2={85} />
      <Box x={118} y={66} label="Downloaders" sub="hashed by domain" tone="good" />
      <Arrow x1={202} y1={85} x2={232} y2={85} />
      <Box x={232} y={66} label="Extract URLs" sub="normalize" />
      <Arrow x1={274} y1={66} x2={274} y2={42} />
      <Arrow x1={160} y1={104} x2={160} y2={120} />
      <Cyl x={104} y={120} w={112} label="Page storage" sub="pages + content hashes" />
    </Frame>
  );
}
