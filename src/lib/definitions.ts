import { z } from 'zod';

export const SignupFormSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(20, { message: "Username must be at most 20 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Username can only contain letters, numbers, and underscores.",
    })
    .trim(),
  email: z
    .string()
    .email({ message: "Please enter a valid email." })
    .trim()
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, { message: "Be at least 8 characters long" })
    .regex(/[a-zA-Z]/, { message: "Contain at least one letter." })
    .regex(/[0-9]/, { message: "Contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Contain at least one special character.",
    })
    .trim(),
});

export type State = {
  errors?: {
    username?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string | null;
};

export const LoginFormSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." })
});