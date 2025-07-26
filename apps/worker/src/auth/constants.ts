// Authentication constants and configuration

export const AUTH_CONFIG = {
  SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  COOKIE_NAME: 'aiswelcome_session',
  MIN_PASSWORD_LENGTH: 8,
  MIN_USERNAME_LENGTH: 2,
  MAX_USERNAME_LENGTH: 15,
  USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/,
  
  // Rate limits
  MAX_STORIES_PER_DAY: 50,
  MAX_COMMENTS_PER_DAY: 200,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  
  // Admin credentials (from .env.local)
  ADMIN_USERNAME: 'franz',
  // Password: claudecode123ce-C (hashed)
  ADMIN_PASSWORD_HASH: 'WQquOh1C0VU+k6qFjKgvuPtEH7dQyPu8KqzUgV8S5t0='
};

// Forbidden usernames - comprehensive list
export const FORBIDDEN_USERNAMES = new Set([
  // System reserved
  'admin', 'administrator', 'root', 'system', 'mod', 'moderator',
  'staff', 'support', 'help', 'api', 'bot', 'aiswelcome', 'hn',
  'hackernews', 'news', 'submit', 'login', 'register', 'logout',
  'user', 'users', 'profile', 'settings', 'account', 'password',
  'email', 'delete', 'edit', 'update', 'create', 'new', 'old',
  'test', 'demo', 'example', 'sample', 'null', 'undefined', 'void',
  'true', 'false', 'anonymous', 'guest', 'public', 'private',
  'about', 'contact', 'privacy', 'terms', 'policy', 'legal',
  'copyright', 'dmca', 'abuse', 'report', 'flag', 'spam',
  
  // Offensive terms (comprehensive list)
  'fuck', 'fucker', 'fucking', 'fucked', 'fucks', 'shit', 'shitter',
  'shitting', 'shitty', 'ass', 'asshole', 'damn', 'damned', 'hell',
  'bitch', 'bitches', 'bastard', 'dick', 'dicks', 'cock', 'cocks',
  'pussy', 'pussies', 'cunt', 'cunts', 'whore', 'whores', 'slut',
  'sluts', 'nigger', 'niggers', 'nigga', 'faggot', 'faggots', 'fag',
  'retard', 'retards', 'retarded', 'gay', 'gays', 'lesbian', 'homo',
  'nazi', 'nazis', 'hitler', 'rape', 'raped', 'raping', 'rapist',
  'kill', 'killer', 'killing', 'murder', 'murderer', 'suicide',
  'porn', 'porno', 'pornography', 'sex', 'sexy', 'xxx', 'drug',
  'drugs', 'cocaine', 'heroin', 'meth', 'weed', 'marijuana',
  
  // Additional protection
  'admin1', 'admin2', 'root1', 'root2', 'test1', 'test2',
  'user1', 'user2', 'bot1', 'bot2', 'ai', 'ml', 'gpt', 'claude',
  'openai', 'anthropic', 'google', 'microsoft', 'apple', 'meta',
  'facebook', 'twitter', 'x', 'instagram', 'tiktok', 'youtube'
]);

// Error messages
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  USERNAME_TAKEN: 'Username already taken',
  USERNAME_FORBIDDEN: 'This username is not allowed',
  USERNAME_INVALID: 'Username can only contain letters, numbers, underscores, and hyphens',
  USERNAME_TOO_SHORT: `Username must be at least ${AUTH_CONFIG.MIN_USERNAME_LENGTH} characters`,
  USERNAME_TOO_LONG: `Username must be at most ${AUTH_CONFIG.MAX_USERNAME_LENGTH} characters`,
  PASSWORD_TOO_SHORT: `Password must be at least ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} characters`,
  SESSION_EXPIRED: 'Session expired. Please login again',
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Please try again later',
  ACCOUNT_LOCKED: 'Account temporarily locked due to too many failed attempts',
  ACCOUNT_BANNED: 'This account has been banned',
  NOT_AUTHENTICATED: 'Please login to continue',
  NOT_AUTHORIZED: 'You do not have permission to perform this action',
  STORY_LIMIT_REACHED: `You can only submit ${AUTH_CONFIG.MAX_STORIES_PER_DAY} stories per day`,
  COMMENT_LIMIT_REACHED: `You can only post ${AUTH_CONFIG.MAX_COMMENTS_PER_DAY} comments per day`
};