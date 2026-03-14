export interface TailscalePeer {
  Active?: boolean;
  AllowedIPs?: string[];
  DNSName?: string;
  ExitNode?: boolean;
  ExitNodeOption?: boolean;
  HostName?: string;
  LastSeen?: string;
  OS?: string;
  Online?: boolean;
  PrimaryRoutes?: string[];
  Relay?: string;
  Tags?: string[];
  TailscaleIPs?: string[];
}

export interface TailscaleStatusMeta {
  generatedAt?: number;
  generatedAtISO?: string;
  serverHost?: string;
}

export interface TailscaleStatus {
  Self?: TailscalePeer;
  Peer?: Record<string, TailscalePeer>;
  _meta?: TailscaleStatusMeta;
  error?: string;
  generatedAt?: number;
}
