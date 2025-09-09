const postgres = require('postgres');

async function testDatabase() {
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require',
  });

  try {
    console.log('Testing database connection...\n');

    // First, check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('user', 'account')
      ORDER BY table_name
    `;

    console.log(
      'Tables found:',
      tables.map(t => t.table_name)
    );

    if (tables.length === 0) {
      console.log('\n❌ Tables "user" and "account" do not exist!');
      console.log('The migration may not have run correctly.');
      return;
    }

    // Check if account table has the right columns
    console.log('\nChecking account table structure...');
    const accountCols = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'account'
        AND column_name IN ('userId', 'provider', 'providerAccountId')
      ORDER BY column_name
    `;

    console.log('Account columns:', accountCols);

    // Try the exact query that's failing
    console.log('\nTrying the NextAuth query...');
    try {
      const result = await sql`
        SELECT 
          account."userId",
          account."provider",
          account."providerAccountId",
          "user"."id",
          "user"."email"
        FROM account
        INNER JOIN "user" ON account."userId" = "user"."id"
        WHERE account."provider" = 'google' 
          AND account."providerAccountId" = '103256889550259070881'
        LIMIT 1
      `;

      console.log('Query executed successfully. Rows found:', result.length);
      if (result.length === 0) {
        console.log(
          'No matching account found (which is expected for first-time login)'
        );
      }
    } catch (queryError) {
      console.error('❌ Query failed with error:', queryError.message);
      console.error('Error code:', queryError.code);
      console.error('Error detail:', queryError.detail);
    }
  } catch (error) {
    console.error('Connection error:', error.message);
  } finally {
    await sql.end();
  }
}

testDatabase();
