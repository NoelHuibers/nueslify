import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export type User = {
    id: string,
    name: string,
    email: string,
    emailVerified: Date | null,
    image: string | null,
    age: number | null,
    state: string | null,
    musicNewsBalance: number | null,
    ai: string,
    hostStyle: string,
    musicTerm: string,
    categories: string
}

export const fetchUser = async (userId: string) => {
    const userData = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    const sUserData = userData[0]
    const user: User = {
        id: sUserData!.id,
        name: sUserData!.name ?? "user",
        email: sUserData!.email,
        emailVerified: sUserData!.emailVerified,
        image: sUserData!.image,
        age: sUserData!.age,
        state: sUserData!.state,
        musicNewsBalance: sUserData!.musicNewsBalance,
        ai: sUserData!.ai ?? "OpenAI",
        hostStyle: sUserData!.hostStyle ?? "Default",
        musicTerm: sUserData!.musicTerm ?? "All-Time Music Favorites",
        categories: sUserData!.categories ?? "[]"
    }
    return user;
}