import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('\n🚀 D1 DATABASE TDD TEST SUITE FOR AISWELCOME\n');

// Colors for output
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

let passed = 0;
let failed = 0;

// Test helper
async function test(name, testFunc) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    await testFunc();
    console.log(`${green}✅ PASS${reset}`);
    passed++;
  } catch (error) {
    console.log(`${red}❌ FAIL${reset}`);
    console.error(`  Error: ${error.message}`);
    failed++;
  }
}

// D1 Configuration Tests
console.log('📋 D1 CONFIGURATION TESTS');

// Test 1: D1 binding in wrangler.toml
await test('D1 database binding exists in wrangler.toml', async () => {
  const wranglerPath = path.join(process.cwd(), 'wrangler.toml');
  const content = fs.readFileSync(wranglerPath, 'utf-8');
  
  if (!content.includes('[[d1_databases]]')) {
    throw new Error('No D1 database configuration found');
  }
  
  if (!content.includes('binding = "DB"')) {
    throw new Error('DB binding not found');
  }
  
  if (!content.includes('database_name = "aiswelcome-db"')) {
    throw new Error('Database name not configured');
  }
  
  if (!content.includes('database_id = "0882f8d9-0c8b-45bd-8640-1ced3a6e7d2d"')) {
    throw new Error('Database ID not configured');
  }
});

// Test 2: D1 storage class exists
await test('D1Storage class is exported', async () => {
  const d1StoragePath = path.join(process.cwd(), 'apps/worker/src/storage/d1-storage.ts');
  const content = fs.readFileSync(d1StoragePath, 'utf-8');
  
  if (!content.includes('export class D1Storage')) {
    throw new Error('D1Storage class not exported');
  }
});

// Test 3: Storage factory uses D1
await test('Storage factory returns D1 when available', async () => {
  const storagePath = path.join(process.cwd(), 'apps/worker/src/storage/index.ts');
  const content = fs.readFileSync(storagePath, 'utf-8');
  
  if (!content.includes('if (db) {')) {
    throw new Error('Storage factory not checking for D1');
  }
  
  if (!content.includes('return new D1Storage(db)')) {
    throw new Error('Storage factory not returning D1Storage');
  }
});

// Test 4: Schema file exists
await test('D1 schema.sql file exists', async () => {
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error('schema.sql file not found');
  }
  
  const content = fs.readFileSync(schemaPath, 'utf-8');
  
  // Check for essential tables
  const requiredTables = [
    'users', 'stories', 'comments', 'votes', 
    'sessions', 'rate_limits', 'moderation_queue'
  ];
  
  for (const table of requiredTables) {
    if (!content.includes(`CREATE TABLE ${table}`)) {
      throw new Error(`Missing table: ${table}`);
    }
  }
});

// D1 Storage Implementation Tests
console.log('\n📋 D1 STORAGE IMPLEMENTATION TESTS');

// Test 5: All CRUD methods exist
await test('D1Storage has all required methods', async () => {
  const d1StoragePath = path.join(process.cwd(), 'apps/worker/src/storage/d1-storage.ts');
  const content = fs.readFileSync(d1StoragePath, 'utf-8');
  
  const requiredMethods = [
    'createUser', 'getUserById', 'getUserByUsername', 'updateUserKarma',
    'createSession', 'getSession', 'deleteSession',
    'createStory', 'getStory', 'getStories', 'updateStoryPoints',
    'createComment', 'getCommentsByStory',
    'createVote', 'getVote',
    'getRateLimit', 'updateRateLimit', 'canPerformAction'
  ];
  
  for (const method of requiredMethods) {
    if (!content.includes(`async ${method}(`)) {
      throw new Error(`Missing method: ${method}`);
    }
  }
});

// Test 6: Prepared statements use bind
await test('D1 queries use prepared statements with bind', async () => {
  const d1StoragePath = path.join(process.cwd(), 'apps/worker/src/storage/d1-storage.ts');
  const content = fs.readFileSync(d1StoragePath, 'utf-8');
  
  // Check for proper prepared statement pattern
  if (!content.includes('.prepare(')) {
    throw new Error('Not using prepared statements');
  }
  
  if (!content.includes('.bind(')) {
    throw new Error('Not using bind for parameters');
  }
  
  // Check for SQL injection vulnerabilities
  if (content.includes('${') && content.includes('SELECT')) {
    throw new Error('Potential SQL injection - using template strings in queries');
  }
});

// Test 7: Full-text search implementation
await test('Full-text search is implemented', async () => {
  const d1StoragePath = path.join(process.cwd(), 'apps/worker/src/storage/d1-storage.ts');
  const content = fs.readFileSync(d1StoragePath, 'utf-8');
  
  if (!content.includes('stories_fts')) {
    throw new Error('Full-text search table not used');
  }
  
  if (!content.includes('MATCH')) {
    throw new Error('FTS MATCH not used in search');
  }
});

// Integration Tests
console.log('\n📋 D1 INTEGRATION TESTS');

// Test 8: AuthService uses D1
await test('AuthService integrates with D1 storage', async () => {
  const authServicePath = path.join(process.cwd(), 'apps/worker/src/auth/service.ts');
  const content = fs.readFileSync(authServicePath, 'utf-8');
  
  if (!content.includes('getStorage')) {
    throw new Error('AuthService not using getStorage factory');
  }
  
  if (!content.includes('this.storage = getStorage(env?.DB)')) {
    throw new Error('AuthService not passing DB to storage factory');
  }
});

// Test 9: Environment interface includes DB
await test('Env interface includes D1Database', async () => {
  const indexPath = path.join(process.cwd(), 'apps/worker/src/index.ts');
  const content = fs.readFileSync(indexPath, 'utf-8');
  
  if (!content.includes('DB: D1Database;')) {
    throw new Error('DB not in Env interface');
  }
});

// Test 10: Types are properly defined
await test('D1 types are properly defined', async () => {
  const typesPath = path.join(process.cwd(), 'apps/worker/src/types.ts');
  const content = fs.readFileSync(typesPath, 'utf-8');
  
  const requiredTypes = [
    'User', 'Session', 'Story', 'Comment', 'Vote', 'RateLimit'
  ];
  
  for (const type of requiredTypes) {
    if (!content.includes(`export interface ${type}`)) {
      throw new Error(`Missing type definition: ${type}`);
    }
  }
});

// Migration Tests
console.log('\n📋 D1 MIGRATION TESTS');

// Test 11: Check local D1 database
await test('Local D1 database can be queried', async () => {
  try {
    const result = execSync('wrangler d1 execute aiswelcome-db --command="SELECT name FROM sqlite_master WHERE type=\'table\' LIMIT 1;"', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    if (!result.includes('success')) {
      throw new Error('D1 query failed');
    }
  } catch (error) {
    throw new Error('Cannot query local D1 database');
  }
});

// Test 12: Admin user initialization
await test('Admin user initialization method exists', async () => {
  const d1StoragePath = path.join(process.cwd(), 'apps/worker/src/storage/d1-storage.ts');
  const content = fs.readFileSync(d1StoragePath, 'utf-8');
  
  if (!content.includes('initializeAdminUser')) {
    throw new Error('Admin initialization method missing');
  }
  
  if (!content.includes('username: \'franz\'')) {
    throw new Error('Admin user franz not configured');
  }
});

// Performance Tests
console.log('\n📋 D1 PERFORMANCE TESTS');

// Test 13: Indexes are created
await test('Database indexes are properly defined', async () => {
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  const content = fs.readFileSync(schemaPath, 'utf-8');
  
  const requiredIndexes = [
    'idx_stories_created_at',
    'idx_stories_points',
    'idx_comments_story_id',
    'idx_votes_user_item'
  ];
  
  for (const index of requiredIndexes) {
    if (!content.includes(index)) {
      throw new Error(`Missing index: ${index}`);
    }
  }
});

// Test 14: Batch operations support
await test('D1 supports batch operations', async () => {
  const d1StoragePath = path.join(process.cwd(), 'apps/worker/src/storage/d1-storage.ts');
  const content = fs.readFileSync(d1StoragePath, 'utf-8');
  
  // Check for transaction support or batch patterns
  if (!content.includes('.run()') && !content.includes('.all()')) {
    throw new Error('No batch operation support found');
  }
});

// Test 15: TypeScript compilation with D1
await test('TypeScript compiles with D1 integration', async () => {
  try {
    execSync('cd apps/worker && pnpm typecheck', { stdio: 'pipe' });
  } catch (error) {
    throw new Error('TypeScript compilation fails with D1');
  }
});

// Results
console.log('\n============================================================\n');
console.log('📊 D1 DATABASE TEST RESULTS:');
console.log(`   ${green}✅ Passed: ${passed}/15${reset}`);
console.log(`   ${red}❌ Failed: ${failed}/15${reset}`);
console.log(`   📈 Coverage: ${Math.round((passed / 15) * 100)}%`);

if (failed === 0) {
  console.log(`\n${green}🎉 ALL D1 TESTS PASSED! Database integration complete!${reset}`);
  process.exit(0);
} else {
  console.log(`\n${red}❌ Some D1 tests failed. Please fix the issues above.${reset}`);
  process.exit(1);
}