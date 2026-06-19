import { Request, Response, NextFunction } from 'express';

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) return ip === cidr;
  const [network, bits] = cidr.split('/') as [string, string];
  const mask = ~((1 << (32 - parseInt(bits, 10))) - 1) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(network) & mask);
}

function isAllowed(ip: string, allowlist: string[]): boolean {
  return allowlist.some((entry) => isIpInCidr(ip, entry));
}

export function requireSafaricomIp(req: Request, res: Response, next: NextFunction): void {
  const raw = process.env['SAFARICOM_IP_ALLOWLIST'] ?? '';
  const allowlist = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // In test/dev environments skip IP check when allowlist is empty
  if (allowlist.length === 0) {
    next();
    return;
  }

  const forwarded = req.headers['x-forwarded-for'];
  const clientIp =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ??
    req.socket.remoteAddress ??
    '';

  if (!isAllowed(clientIp, allowlist)) {
    res.status(403).json({
      error_code: 'FORBIDDEN_IP',
      message_key: 'error.forbidden_ip',
      request_id: req.headers['x-request-id'] ?? '',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}
