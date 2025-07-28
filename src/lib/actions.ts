"use server"
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function verifyCredentials(email: string, password: string) {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user.length) {
      return { success: false, message: "Invalid credentials." };
    }

    const isValidPassword = await bcrypt.compare(password, user[0].password);

    if (!isValidPassword) {
      return { success: false, message: "Invalid credentials." };
    }

    return { success: true, user: { email: user[0].email, name: user[0].name } };
  } catch (error) {
    console.error("Verification error:", error);
    return { success: false, message: "Something went wrong." };
  }
}

export async function signup(prevState: any, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 12);
    
    await db.insert(users).values({
      name: name,
      email: email,
      password: hashedPassword, // Store hashed password
    });
    return "Signup successful!";
  } catch (error) {
    console.error("Signup error:", error);
    return "Something went wrong.";
  }
}
