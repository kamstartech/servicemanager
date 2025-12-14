-- CreateTable
CREATE TABLE "fdh_mobile_user_profiles" (
    "id" SERIAL NOT NULL,
    "mobile_user_id" INTEGER NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "zip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdh_mobile_user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fdh_mobile_user_profiles_mobile_user_id_key" ON "fdh_mobile_user_profiles"("mobile_user_id");

-- AddForeignKey
ALTER TABLE "fdh_mobile_user_profiles" ADD CONSTRAINT "fdh_mobile_user_profiles_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
