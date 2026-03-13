/**
 * 数据库数据检查脚本
 * 检查 tool_interactions 表中是否有 AI Advisor 相关数据
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Wb8lMyAIZv1m@ep-little-rain-ai32bkeo-pooler.c-4.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function checkData() {
  const sql = neon(DATABASE_URL);
  
  console.log('=== 数据库数据检查 ===\n');
  
  // 1. 检查租户
  console.log('1. 租户数据:');
  const tenants = await sql`SELECT id, name, slug FROM public.tenants`;
  console.log(tenants);
  console.log('');
  
  // 2. 检查 tool_interactions 表的所有数据
  console.log('2. tool_interactions 表数据 (最近 20 条):');
  const interactions = await sql`
    SELECT id, tool_name, action, input_params, created_at 
    FROM public.tool_interactions 
    ORDER BY created_at DESC 
    LIMIT 20
  `;
  console.log(interactions);
  console.log('');
  
  // 3. 检查是否有 AI Advisor 相关数据
  console.log('3. AI Advisor 相关数据:');
  const aiAdvisorData = await sql`
    SELECT id, tool_name, action, input_params, created_at 
    FROM public.tool_interactions 
    WHERE tool_name ILIKE '%ai%' OR tool_name ILIKE '%advisor%' OR tool_name ILIKE '%问题%'
    ORDER BY created_at DESC 
    LIMIT 20
  `;
  console.log(aiAdvisorData);
  console.log('');
  
  // 4. 按工具名称统计
  console.log('4. 按工具名称统计:');
  const stats = await sql`
    SELECT tool_name, COUNT(*) as count 
    FROM public.tool_interactions 
    GROUP BY tool_name 
    ORDER BY count DESC
  `;
  console.log(stats);
  console.log('');
  
  // 5. 检查 chat_messages 表
  console.log('5. chat_messages 表数据 (如果有的话):');
  try {
    const chatMessages = await sql`
      SELECT * FROM public.chat_messages 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    console.log(chatMessages);
  } catch (e) {
    console.log('chat_messages 表不存在或无数据');
  }
  
  console.log('\n=== 检查完成 ===');
}

checkData().catch(console.error);
