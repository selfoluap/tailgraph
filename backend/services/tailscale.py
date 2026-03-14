from __future__ import annotations

import json
import socket
import subprocess
import time
from dataclasses import dataclass


@dataclass
class TailscaleService:
    host_override: str = ""

    def run_command(self, cmd: list[str]) -> str:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            stderr = (proc.stderr or "").strip()
            stdout = (proc.stdout or "").strip()
            detail = stderr or stdout or f"exit code {proc.returncode}"
            raise RuntimeError(f"{' '.join(cmd)} failed: {detail}")
        return proc.stdout

    def get_tailscale_ipv4(self) -> str:
        output = self.run_command(["tailscale", "ip", "-4"])
        for line in output.splitlines():
            ip = line.strip()
            if ip:
                return ip
        raise RuntimeError("could not determine Tailscale IPv4 address")

    def guess_host(self) -> str:
        if self.host_override:
            return self.host_override
        return self.get_tailscale_ipv4()

    def fetch_status(self) -> dict:
        raw = self.run_command(["tailscale", "status", "--json"])
        data = json.loads(raw)
        data["_meta"] = {
            "generatedAt": int(time.time()),
            "generatedAtISO": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "serverHost": socket.gethostname(),
        }
        return data
