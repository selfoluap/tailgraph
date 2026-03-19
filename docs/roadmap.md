# Tailgraph Roadmap

This file is a lightweight place to capture product and implementation ideas as Tailgraph evolves.

## Current Direction

Tailgraph already has the core pieces for tailnet visualization:

- FastAPI backend
- React canvas-based graph UI
- Local Tailscale status ingestion via `tailscale status --json`
- Saved groups and layout/config persistence

That means the next roadmap items should build on the existing graph and inventory foundation rather than restart it.

## Roadmap Ideas

### Tailnet Inventory to Ansible Workflow

Status: in progress concept, likely partially implemented already

Goal:
Use the Tailscale admin API to dynamically discover and group all nodes in the tailnet, then generate an Ansible inventory from that data and run custom playbooks across selected nodes through Ansible Runner.

Proposed flow:

```text
[Web UI]
   |
   v
[Python app / FastAPI]
   |- sync nodes from Tailscale API
   |- show inventory / health
   |- authorize requested action
   |- create dynamic inventory
   |- start job with Ansible Runner
   |
   v
[Runner worker]
   |- runs playbook against Tailscale IPs / hostnames
   |- streams logs/events back
   |
   v
[Tailscale nodes]
```

Why it fits Tailgraph:

- Tailgraph already models nodes and groups in the UI
- The backend already owns inventory-shaped data assembly
- The graph can become the node selection surface for automation
- Existing saved groups map naturally to inventory groups or playbook targets

Potential milestones:

1. Add hosted Tailscale admin API sync alongside the current local CLI status source.
2. Normalize node identity so local status nodes and admin API devices can be merged reliably.
3. Extend groups so they can act as automation target sets, not just visual organization.
4. Generate a dynamic Ansible inventory from selected nodes, tags, or saved groups.
5. Add a job-launch API that validates requested playbooks and target scopes.
6. Run playbooks through Ansible Runner in a worker-oriented execution path.
7. Stream Runner events and logs back to the UI for live progress and results.
8. Add guardrails: approvals, audit trail, allowed playbook list, and node eligibility checks.

Open questions:

- Should automation use Tailscale IPs, MagicDNS names, or a per-node connection preference?
- Will Tailgraph own playbook storage, or invoke a separate automation repository?
- Does the first version need read-only health checks before arbitrary playbook execution?
- Should Runner jobs execute in-process, via background tasks, or in a separate worker service?
- How should node authorization map to the existing Tailgraph UI and any future RBAC model?

Near-term framing:

- Keep the current graph experience as the primary inventory browser.
- Treat admin API sync as an enrichment layer, not a replacement for local status.
- Start with safe operational workflows such as ping, package facts, disk usage, or service checks.
- Only add arbitrary playbook execution after the approval and audit model is clear.
