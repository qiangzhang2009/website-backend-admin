import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Wb8lMyAIZv1m@ep-little-rain-ai32bkeo-pooler.c-4.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function checkData() {
  const sql = neon(DATABASE_URL);
  
  console.log('Checking tracking_events...');
  
  const result = await sql`
    SELECT * FROM public.tracking_events 
    ORDER BY created_at DESC 
    LIMIT 5
  `;
  
  console.log('Recent tracking events:', JSON.stringify(result, null, 2));
}

checkData().catch(console.error).finally(() => process.exit(0));
