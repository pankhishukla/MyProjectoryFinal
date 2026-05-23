import { mysqlTable, varchar, timestamp, int } from "drizzle-orm/mysql-core";

export const waitlist = mysqlTable("waitlist", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
