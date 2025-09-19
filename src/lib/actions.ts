"use server";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { SignupFormSchema, State } from "./definitions";
import { redirect } from "next/navigation";

export async function verifyCredentials(email: string, password: string) {
  try {
    console.log("[verifyCredentials] Attempting to verify:", email);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user.length) {
      console.log("[verifyCredentials] User not found.");
      return { success: false, message: "Invalid credentials." };
    }
    console.log("[verifyCredentials] User found:", user[0].email);

    const isValidPassword = await bcrypt.compare(password, user[0].password);
    console.log("[verifyCredentials] Password valid:", isValidPassword);

    if (!isValidPassword) {
      return { success: false, message: "Invalid credentials." };
    }

    return {
      success: true,
      user: { email: user[0].email, name: user[0].name },
    };
  } catch (error) {
    console.error("[verifyCredentials] Error:", error);
    return { success: false, message: "Something went wrong." };
  }
}

export async function signup(prevState: State, formData: FormData) {
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Account.",
    };
  }

  const { name, email, password } = validatedFields.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.insert(users).values({
      name: name,
      email: email,
      password: hashedPassword,
    });
  } catch {
    return { message: "Database Error: Failed to Create Account." };
  }
  redirect("/login");
}
