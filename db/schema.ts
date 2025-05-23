import { pgTable, serial, text, timestamp, varchar, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 예약 상태 열거형 정의
export const reservationStatusEnum = pgEnum("reservation_status", ["대기", "완료", "취소"]);

// 매장 테이블 정의
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address").notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  description: text("description"),
  reservationUrl: text("reservation_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 매장 관계 정의
export const storesRelations = relations(stores, ({ many }) => ({
  watchModels: many(watchModels),
  reservations: many(reservations),
}));

// 시계 모델 테이블 정의
export const watchModels = pgTable("watch_models", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  reference: varchar("reference", { length: 50 }).notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 시계 모델 관계 정의
export const watchModelsRelations = relations(watchModels, ({ one, many }) => ({
  store: one(stores, {
    fields: [watchModels.storeId],
    references: [stores.id],
  }),
  reservations: many(reservations),
}));

// 사용자 테이블 정의
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).unique(), // Clerk ID는 선택사항으로 변경
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  carrier: varchar("carrier", { length: 20 }), // 통신사 (SKT, KT, LG U+ 등)
  password: text("password"), // 해시된 비밀번호 저장
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 사용자 관계 정의
export const usersRelations = relations(users, ({ many }) => ({
  reservations: many(reservations),
}));

// 예약 테이블 정의
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  watchModelId: integer("watch_model_id").references(() => watchModels.id).notNull(),
  status: reservationStatusEnum("status").default("대기").notNull(),
  reservationDate: timestamp("reservation_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 예약 관계 정의
export const reservationsRelations = relations(reservations, ({ one }) => ({
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
  store: one(stores, {
    fields: [reservations.storeId],
    references: [stores.id],
  }),
  watchModel: one(watchModels, {
    fields: [reservations.watchModelId],
    references: [watchModels.id],
  }),
}));
