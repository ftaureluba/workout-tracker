"use server";
import { seedUserWorkouts } from "./user-seeding";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { SignupFormSchema, State } from "./definitions";
import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/rate-limit";

export async function verifyCredentials(username: string, password: string) {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user.length) {
      return { success: false, message: "Invalid credentials." };
    }

    const isValidPassword = await bcrypt.compare(password, user[0].password);

    if (!isValidPassword) {
      return { success: false, message: "Invalid credentials." };
    }

    return {
      success: true,
      user: { username: user[0].username, name: user[0].name },
    };
  } catch (error) {
    console.error("[verifyCredentials] Error:", error);
    return { success: false, message: "Something went wrong." };
  }
}

export async function signup(prevState: State, formData: FormData) {
  const validatedFields = SignupFormSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email") || undefined,
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Account.",
    };
  }

  const { username, email, password } = validatedFields.data;

  // Rate limit signup attempts by username
  const { success } = rateLimit(`signup:${username}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!success) {
    return { message: "Too many signup attempts. Please try again later." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const [newUser] = await db.insert(users).values({
      name: username,
      username: username,
      email: email || null,
      password: hashedPassword,
    }).returning();

    // Seed default workouts for the new user
    await seedUserWorkouts(newUser.id);
  } catch (error: any) {
    // Check for unique constraint violation on username
    if (error?.code === "23505" && error?.constraint?.includes("username")) {
      return { message: "Username already taken. Please choose another." };
    }
    console.error("Signup error:", error);
    return { message: "Database Error: Failed to Create Account." };
  }
  redirect("/login");
}
