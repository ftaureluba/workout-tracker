require('dotenv').config();
const postgres = require('postgres');

async function main() {
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Unset');
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing from environment');
        return;
    }

    // Setup connection - handle SSL requirement for Neon
    const sql = postgres(process.env.DATABASE_URL, {
        ssl: 'require'
    });

    try {
        console.log('Querying database for push_jobs table...');
        const res = await sql`SELECT table_name 
                              FROM information_schema.tables 
                              WHERE table_schema = 'public' 
                              AND table_name = 'push_jobs'`;

        if (res && res.length > 0) {
            console.log('SUCCESS: "push_jobs" table exists!');
        } else {
            console.error('FAILURE: "push_jobs" table NOT FOUND.');
        }

        const res2 = await sql`SELECT count(*) as count FROM push_jobs`;
        console.log('Current row count in push_jobs:', res2[0].count);

    } catch (e) {
        console.error('Database Error:', e);
    } finally {
        await sql.end();
    }
}

main();
