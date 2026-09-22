import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileCheck2,
  Fingerprint,
  GraduationCap,
  Lock,
  Link2,
  ShieldCheck,
  Upload,
  UserCog,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FYP-Repository — Blockchain Final Year Project Repository" },
      {
        name: "description",
        content:
          "Submit, supervise and verify final year projects with tamper-evident SHA-256 document hashes anchored to the Ethereum Sepolia blockchain.",
      },
      { property: "og:title", content: "FYP-Repository — Blockchain Project Repository" },
      {
        property: "og:description",
        content:
          "A university-grade repository with role-based access, supervisor review workflow and on-chain document provenance.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Upload, title: "Structured submissions", text: "Students draft, upload PDFs and submit for review with enforced workflow rules." },
  { icon: Fingerprint, title: "SHA-256 fingerprints", text: "Every document is hashed on upload and re-hashed server-side before it is accepted." },
  { icon: Link2, title: "On-chain provenance", text: "Hashes, identifiers and timestamps are anchored to a Solidity smart contract on Sepolia." },
  { icon: FileCheck2, title: "Supervisor review", text: "Assigned supervisors approve, reject or request revisions with scored feedback." },
  { icon: Database, title: "Version history", text: "Every uploaded revision is retained with its own hash and blockchain record." },
  { icon: Lock, title: "Row-level security", text: "Database policies enforce who may read each project, submission and review." },
];

const steps = [
  { n: "01", title: "Create the project", text: "A student registers with their matriculation number and records project details." },
  { n: "02", title: "Upload the document", text: "The PDF is validated, hashed in the browser and stored in secure cloud storage." },
  { n: "03", title: "Anchor the hash", text: "On submission the server re-hashes the file and writes the digest to the blockchain." },
  { n: "04", title: "Review and verify", text: "Supervisors review; anyone authorised can verify the document against the chain." },
];

const roles = [
  { icon: GraduationCap, title: "Student", points: ["Create and manage one project", "Upload PDF versions and drafts", "Track submission status", "Read supervisor feedback"] },
  { icon: Users, title: "Supervisor", points: ["See only assigned projects", "Download submitted documents", "Approve or request revisions", "Score and comment on work"] },
  { icon: UserCog, title: "Administrator", points: ["Manage students and supervisors", "Assign supervisors to projects", "Oversee submissions and records", "Audit every privileged action"] },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-deep/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">FYP-Repository</p>
              <p className="text-[10px] text-white/60">Blockchain Based Project Repository</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              <Link to="/auth">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "register" }}>Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="hero-gradient relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
              <Link2 className="size-3.5" /> Anchored on Ethereum Sepolia
            </span>
            <h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
              Blockchain-Based Final Year Project Repository System
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/75">
              A single, verifiable home for undergraduate project work. Documents live in secure storage;
              their cryptographic fingerprints live on a public blockchain — so approval, authorship and
              timing can never be quietly rewritten.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "register" }}>
                  Get Started <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link to="/auth">Login</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
              {[
                ["SHA-256", "document hashing"],
                ["Solidity", "provenance contract"],
                ["RLS", "row-level security"],
              ].map(([a, b]) => (
                <div key={a}>
                  <dt className="text-lg font-bold text-white">{a}</dt>
                  <dd className="text-xs text-white/60">{b}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5 shadow-panel backdrop-blur">
              <div className="rounded-xl bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Verification result</p>
                  <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">VERIFIED</span>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  {[
                    ["Document hash", "a3f9c2…9d41"],
                    ["Blockchain hash", "a3f9c2…9d41"],
                    ["Transaction", "0x7b21…c8ea"],
                    ["Anchored", "Block 6,421,903"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono font-medium">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 p-3 text-xs text-success">
                  <CheckCircle2 className="size-4" /> Stored hash matches the on-chain record.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">Built for academic integrity</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Everything a department needs to run project submission end to end, with cryptographic proof at each step.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="surface-card p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/60 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="surface-card p-5">
                <span className="text-sm font-bold text-primary">{s.n}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">What the blockchain actually stores</h2>
            <p className="mt-3 text-muted-foreground">
              Project documents are never written to the chain. Only a 256-bit fingerprint and its identifiers
              are anchored, which is enough to prove a file has not changed since submission — without exposing
              any of its contents.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "SHA-256 digest of the submitted PDF",
                "Project identifier and submission identifier",
                "Block timestamp recorded by the network",
                "Transaction reference for independent audit",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="surface-card overflow-hidden">
            <div className="bg-navy px-5 py-3 text-xs font-semibold text-white">ProjectRegistry.sol</div>
            <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-muted-foreground">
{`function anchor(
  bytes32 recordKey,
  bytes32 docHash,
  string calldata projectId,
  string calldata submissionId
) external {
  require(!records[recordKey].exists, "record exists");
  records[recordKey] = Record(
    docHash, projectId, submissionId,
    block.timestamp, msg.sender, true
  );
  emit Anchored(recordKey, docHash, projectId,
    submissionId, block.timestamp, msg.sender);
}`}
            </pre>
          </div>
        </div>
      </section>

      <section className="bg-secondary/60 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight">One platform, three roles</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {roles.map((r) => (
              <div key={r.title} className="surface-card p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <r.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{r.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="hero-gradient rounded-2xl px-8 py-12 text-white">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Security by design</h2>
              <p className="mt-3 text-white/75">
                Authorisation is enforced in the database, not the browser. Roles live in a dedicated table,
                policies scope every row to its owner or assigned supervisor, and privileged operations run
                server-side where the client cannot reach them.
              </p>
            </div>
            <ul className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                "Roles in a separate table",
                "Row-level security on every table",
                "Private document storage",
                "Server-side workflow enforcement",
                "Full audit trail of admin actions",
                "Hash re-computed on the server",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 rounded-lg border border-white/15 bg-white/5 p-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8">
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth" search={{ mode: "register" }}>Create your account</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-navy-deep py-10 text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-white">FYP-Repository</p>
            <p className="text-xs">Blockchain Based Final Year Project Repository System</p>
          </div>
          <div className="flex gap-6 text-sm">
            <Link to="/auth" className="hover:text-white">Login</Link>
            <Link to="/auth" search={{ mode: "register" }} className="hover:text-white">Register</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} University Project Repository</p>
        </div>
      </footer>
    </div>
  );
}
