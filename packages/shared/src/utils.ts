// Generate unique IDs
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

// Generate secure token (Cloudflare Workers compatible)
export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length];
  }
  return result;
}

// Hash password (for D1, we'll use a simple approach)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}

// Hash URL for duplicate detection
export function hashUrl(url: string): string {
  // Normalize URL
  const normalized = url.toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/$/, '');
  
  // Simple hash for D1 storage
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Calculate ranking score
export function calculateRankScore(
  points: number,
  createdAt: Date,
  trustScore: number = 1.0,
  penalties: { domain?: number; flood?: number } = {}
): number {
  const now = new Date();
  const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  // HN-style ranking
  const base = (points - 1) / Math.pow(ageHours + 2, 1.8);
  
  // Trust multiplier [0.5, 2.0]
  const trust = 0.5 + Math.min(1.5, trustScore);
  
  // Apply penalties
  const domainPenalty = penalties.domain ?? 1.0;
  const floodPenalty = penalties.flood ?? 1.0;
  const diversityPenalty = domainPenalty * floodPenalty;
  
  return base * trust * diversityPenalty;
}

// Format relative time
export function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

// Extract domain from URL
export function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Sanitize HTML (basic version)
export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Parse markdown-lite (HN style)
export function parseMarkdownLite(text: string): string {
  const sanitized = sanitizeHtml(text);
  
  return sanitized
    // Convert URLs to links
    .replace(
      /https?:\/\/[^\s<]+/g,
      (url) => `<a href="${url}" rel="nofollow">${url}</a>`
    )
    // Convert newlines to <br>
    .replace(/\n/g, '<br>')
    // Simple code blocks (indented lines)
    .replace(/^ {4}(.+)$/gm, '<pre>$1</pre>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<i>$1</i>');
}

// Get nested comment structure
export interface NestedComment {
  id: number;
  text: string;
  user_id?: number;
  agent_id?: number;
  points: number;
  created_at: string;
  children: NestedComment[];
}

export function nestComments(comments: any[]): NestedComment[] {
  const commentMap = new Map<number, NestedComment>();
  const roots: NestedComment[] = [];
  
  // First pass: create all nodes
  for (const comment of comments) {
    commentMap.set(comment.id, {
      ...comment,
      children: [],
    });
  }
  
  // Second pass: build tree
  for (const comment of comments) {
    const node = commentMap.get(comment.id)!;
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }
  
  return roots;
}

// Validate scopes
export function hasScope(scopes: string[], required: string): boolean {
  const scopeList = scopes.join(',').split(',');
  return scopeList.includes(required);
}

// Generate ULID-like request ID
export function generateRequestId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${time}-${random}`;
}