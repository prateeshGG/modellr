-- Django / Rails style simple schema
CREATE TABLE IF NOT EXISTS "auth_user" (
  "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  "username" varchar(150) NOT NULL UNIQUE,
  "email" varchar(254) NOT NULL,
  "is_staff" bool NOT NULL,
  "date_joined" datetime NOT NULL
);
CREATE TABLE "blog_post" (
  "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  "title" varchar(200) NOT NULL,
  "body" text NOT NULL,
  "author_id" integer NOT NULL REFERENCES "auth_user" ("id") DEFERRABLE INITIALLY DEFERRED,
  "published_at" datetime NULL
);
CREATE TABLE "blog_comment" (
  "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  "post_id" integer NOT NULL REFERENCES "blog_post" ("id") DEFERRABLE INITIALLY DEFERRED,
  "author_id" integer NULL REFERENCES "auth_user" ("id") DEFERRABLE INITIALLY DEFERRED,
  "body" text NOT NULL
);
CREATE TABLE "blog_post_tags" (
  "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  "post_id" integer NOT NULL REFERENCES "blog_post" ("id"),
  "tag_id" integer NOT NULL REFERENCES "blog_tag" ("id")
);
CREATE TABLE "blog_tag" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "name" varchar(50) NOT NULL);
CREATE UNIQUE INDEX "blog_tag_name_uniq" ON "blog_tag" ("name");
CREATE INDEX "blog_post_author_idx" ON "blog_post" ("author_id");

-- Rails
CREATE TABLE "accounts" (
  "id" bigserial PRIMARY KEY,
  "name" character varying NOT NULL,
  "created_at" timestamp(6) without time zone NOT NULL
);
CREATE TABLE "memberships" (
  "id" bigserial PRIMARY KEY,
  "account_id" bigint NOT NULL,
  "user_id" bigint NOT NULL UNIQUE,
  CONSTRAINT fk_rails_1 FOREIGN KEY ("account_id") REFERENCES "accounts" ("id")
);
