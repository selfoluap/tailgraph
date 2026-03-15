export interface TailscalePeer {
  Active?: boolean;
  AllowedIPs?: string[];
  DiscoveredServices?: TailscaleDiscoveredService[];
  DNSName?: string;
  ExitNode?: boolean;
  ExitNodeOption?: boolean;
  Groups?: string[];
  HostName?: string;
  LastHandshake?: string;
  LastSeen?: string;
  LastWrite?: string;
  OS?: string;
  Online?: boolean;
  PrimaryRoutes?: string[];
  Relay?: string;
  Tags?: string[];
  TailscaleIPs?: string[];
}

export interface TailscaleDiscoveredService {
  label?: string;
  port?: number;
  protocol?: string;
}

export interface TailscaleServiceDiscoveryMeta {
  durationMs?: number;
  enabled?: boolean;
  error?: string;
  ports?: number[];
  scannedAt?: string;
  skippedNodes?: string[];
  status?: string;
  stale?: boolean;
  timeoutMs?: number;
}

export interface TailscaleStatusMeta {
  generatedAt?: number;
  generatedAtISO?: string;
  serverHost?: string;
  serviceDiscovery?: TailscaleServiceDiscoveryMeta;
}

export interface TailscaleStatus {
  Self?: TailscalePeer;
  Peer?: Record<string, TailscalePeer>;
  _meta?: TailscaleStatusMeta;
  error?: string;
  generatedAt?: number;
}
