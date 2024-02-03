import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  age: number | null;
  state: string | null;
  musicNewsBalance: number | null;
  ai: string;
  hostStyle: string;
  musicTerm: string;
  categories: string;
};

export const fetchUser = async (userId: string) => {
  const userDataArray = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userData = userDataArray[0];
  if (!userData) {
    throw new Error("User not found");
  }

  const user: User = {
    id: userData.id,
    name: userData.name ?? "user",
    email: userData.email,
    emailVerified: userData.emailVerified,
    image: userData.image,
    age: userData.age,
    state: userData.state,
    musicNewsBalance: userData.musicNewsBalance,
    ai: userData.ai ?? "OpenAI",
    hostStyle: userData.hostStyle ?? "Default",
    musicTerm: userData.musicTerm ?? "All-Time Music Favorites",
    categories: userData.categories ?? "[]",
  };

  return user;
};
