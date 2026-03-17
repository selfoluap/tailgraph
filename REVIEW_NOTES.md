# Review Notes

## Summary

The patch introduces a real regression for tailnets without MagicDNS because some generated service links become unresolvable.

Separately, the backend registers the frontend so the FastAPI app can serve the built SPA at `/` and its static assets from one process; that is only needed if this backend is meant to host the UI, and can be removed if the frontend is deployed separately.

## Review Comment

### [P2] Prefer the Tailscale IP when MagicDNS is unavailable

- File: `/root/tailgraph/frontend/src/components/DetailsPanel.tsx:85`
- Issue: In setups where `DNSName` is empty, this now builds links from `node.hostname` before `node.ip`.
- Impact: `HostName` is often just a local machine name and is not generally resolvable from other tailnet devices, so the clickable service badges can point to URLs like `http://my-laptop:8000` instead of the reachable Tailscale address.
- Recommended fix: Use the IP as the fallback before `hostname` to avoid breaking service links when MagicDNS is disabled.
