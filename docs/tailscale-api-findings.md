# Tailscale API Findings for Tailgraph

## Overview

Tailgraph currently uses the local Tailscale CLI status payload, not the hosted Tailscale admin API. The backend shells out to `tailscale status --json` in [backend/services/tailscale.py](/root/tailgraph/backend/services/tailscale.py), and the frontend maps a subset of that payload into graph nodes, filters, and the details panel in [frontend/src/types/tailscale.ts](/root/tailgraph/frontend/src/types/tailscale.ts), [frontend/src/graph/buildGraph.ts](/root/tailgraph/frontend/src/graph/buildGraph.ts), [frontend/src/components/ControlSheet.tsx](/root/tailgraph/frontend/src/components/ControlSheet.tsx), and [frontend/src/components/DetailsPanel.tsx](/root/tailgraph/frontend/src/components/DetailsPanel.tsx).

That means there are two relevant buckets of Tailscale data:

- Local node status data available immediately from `tailscale status --json`
- Tailnet-wide inventory and admin data available if Tailgraph adds the hosted Tailscale admin API

## Fields Tailgraph Already Uses

Tailgraph already consumes these local status fields:

- `DNSName`
- `HostName`
- `TailscaleIPs`
- `OS`
- `Tags`
- `AllowedIPs`
- `PrimaryRoutes`
- `Online`
- `Active`
- `Relay`
- `ExitNode`
- `ExitNodeOption`

These currently drive:

- Node identity and labels in the graph
- Status sorting and filtering
- Exit-node and subnet-router badges
- Search by name, IP, DNS, tag, and OS
- Details panel basics like IP, DNS, OS, relay, and tags

## Additional Local Status Fields Worth Using

These fields are available from the same local status payload and are likely relevant to Tailgraph without changing the core backend data source.

### Identity

- `ID`
- `PublicKey`
- `UserID`

Why they matter:

- Stable node identifiers for cross-linking and persistence
- User or owner grouping in the UI
- More useful detail views and debugging

### Connectivity

- `Addrs`
- `CurAddr`
- `PeerRelay`
- `InNetworkMap`
- `InMagicSock`
- `InEngine`

Why they matter:

- Show direct-vs-relay state and current path quality
- Surface endpoint information for troubleshooting
- Distinguish between nodes known to control plane vs actively present in the local engine

### Activity and Timing

- `Created`
- `LastSeen`
- `LastWrite`
- `LastHandshake`

Why they matter:

- Identify stale devices
- Display recently active vs dormant nodes
- Improve sort and filter options
- Make the details panel materially more useful for debugging

### Traffic

- `RxBytes`
- `TxBytes`

Why they matter:

- Highlight active nodes
- Support traffic-based sorting or badges
- Enable a future activity overlay without changing the source

### Capabilities and Features

- `Capabilities`
- `CapMap`
- `PeerAPIURL`
- `TaildropTarget`
- `NoFileSharingReason`
- `KeyExpiry`

Why they matter:

- Show whether nodes support SSH, file sharing, HTTPS, or other features
- Flag expiring node keys
- Indicate whether a node can receive Taildrop files
- Expose richer operational detail per node

### Tailnet and Runtime Metadata

- Top-level `Version`
- Top-level `BackendState`
- Top-level `Health`
- Top-level `MagicDNSSuffix`
- Top-level `CurrentTailnet`
- Top-level `CertDomains`
- Top-level `TUN`
- Top-level `HaveNodeKey`
- Top-level `AuthURL`

Why they matter:

- Show the health of the local collector node
- Identify misconfiguration or auth problems
- Display tailnet context in the UI header or diagnostics
- Help distinguish local daemon state from peer state

## Highest-Value Additions for Tailgraph

If Tailgraph stays centered on local status data, these are the highest-value fields to add first.

### 1. Better Node Status

Prioritize:

- `LastHandshake`
- `LastWrite`
- `Health`
- `BackendState`

Likely UI use:

- “Seen X ago” in the details panel
- Filters for stale or unhealthy nodes
- Better status text than just online/offline/unknown

### 2. Ownership and Grouping

Prioritize:

- `UserID`

Likely UI use:

- Group nodes by owner
- Filter by person or service account once user mapping exists

### 3. Connectivity Diagnostics

Prioritize:

- `Addrs`
- `CurAddr`
- `PeerRelay`
- `InNetworkMap`
- `InMagicSock`
- `InEngine`

Likely UI use:

- Show direct vs DERP path state
- Troubleshooting details for selected nodes
- Future badges for reachable, relayed, or partially active nodes

### 4. Richer Node Details

Prioritize:

- `PublicKey`
- `KeyExpiry`
- `Capabilities`
- `CapMap`
- `TaildropTarget`

Likely UI use:

- Advanced details panel section
- Security and lifecycle visibility
- Feature badges such as SSH or file sharing support

### 5. Activity Overlay

Prioritize:

- `RxBytes`
- `TxBytes`

Likely UI use:

- Sort or highlight nodes by traffic
- Add “active recently” heuristics

## Relevant Admin API Data If Tailgraph Expands

If Tailgraph moves beyond the local CLI payload and adopts the hosted Tailscale admin API, these categories become relevant.

### Devices

Use for:

- Canonical tailnet-wide device inventory
- Device ownership, naming, authorization, and lifecycle actions

### Routes

Use for:

- Subnet router state
- Exit-node availability and approval state

### Posture Attributes

Use for:

- Compliance and security overlays
- Device trust state in the graph

### Users

Use for:

- Mapping `UserID` to human-readable owners
- Grouping nodes by person or team

### DNS

Use for:

- Showing tailnet DNS configuration and context
- Explaining naming behavior in the UI

### Policy File

Use for:

- Explaining reachability and access rules
- Future ACL or grants overlays

### Services

Use for:

- Surfacing published services or approved hosts
- Enriching the graph beyond raw devices

### Configuration Audit Logs

Use for:

- Timeline of device, policy, and admin changes
- Explaining why graph state changed

### Network Flow Logs

Use for:

- Real connection edges between nodes
- Historical activity, not just inventory

### Webhooks

Use for:

- Live updates instead of poll-only refresh
- Reacting to node joins, policy changes, and approvals

## Most Relevant Admin API Additions for Tailgraph

If only a few admin API capabilities are added, these are the most relevant:

- Device inventory and core metadata
- Routes and exit-node state
- User mapping
- Posture attributes
- Configuration audit logs
- Network flow logs
- Webhooks

## Important Architectural Note

Tailgraph currently builds a star graph from `self` to each peer rather than rendering observed communication edges. In the current implementation, every peer is connected from the local node in [frontend/src/graph/buildGraph.ts](/root/tailgraph/frontend/src/graph/buildGraph.ts).

Because of that, the Tailscale data source that would change the graph most materially is network flow logging. Local status and device inventory improve node metadata, diagnostics, and filtering. Flow logs are what enable real relationship edges over time.

## Sources

- Tailscale API overview: https://tailscale.com/docs/reference/tailscale-api
- Trust credentials and scopes: https://tailscale.com/docs/reference/trust-credentials
- OAuth clients: https://tailscale.com/docs/features/oauth-clients
- Webhooks: https://tailscale.com/kb/1213/webhooks/
- Network flow logs: https://tailscale.com/docs/features/logging/network-flow-logs
- Configuration audit logs: https://tailscale.com/docs/features/logging/audit-logging
- Tailscale Services: https://tailscale.com/docs/features/tailscale-services
