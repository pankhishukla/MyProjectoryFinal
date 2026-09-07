const { db } = require('./dist/lib/db/index.js');
const { eq } = require('drizzle-orm');
const { roadmapsTable, milestonesTable, tasksTable } = require('./dist/lib/db/schema/index.js');

async function check() {
  const allRoadmaps = await db.select().from(roadmapsTable);
  console.log('Roadmaps count:', allRoadmaps.length);
  
  if (allRoadmaps.length === 0) {
    console.log('No roadmaps found');
    return;
  }
  
  const lastId = allRoadmaps[allRoadmaps.length - 1].id;
  console.log('Last roadmap ID:', lastId);
  
  const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.roadmapId, lastId)).orderBy(milestonesTable.orderIndex);
  console.log('Milestones count:', milestones.length);
  
  milestones.forEach(ms => {
    console.log('  Milestone', ms.id, ':', ms.title, 'orderIndex:', ms.orderIndex);
  });
  
  for (const ms of milestones) {
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.milestoneId, ms.id));
    console.log('  Tasks for milestone', ms.id, ':', tasks.length, 'titles:', tasks.map(t => t.title).join(', '));
  }
}

check().catch(e => console.error(e));
