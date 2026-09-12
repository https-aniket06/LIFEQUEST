import { z } from "zod";

export const questCategorySchema = z.enum(["KNOWLEDGE", "FITNESS", "DISCIPLINE", "CREATIVITY", "WELLNESS"]);
export const questDifficultySchema = z.enum(["EASY", "NORMAL", "HARD", "EPIC"]);
export const repeatFrequencySchema = z.enum(["NONE", "DAILY", "WEEKLY"]);

export const createQuestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give your quest a title.")
    .max(140, "Keep the title under 140 characters."),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  category: questCategorySchema,
  difficulty: questDifficultySchema,
  repeatFrequency: repeatFrequencySchema.default("NONE"),
  dueDate: z.string().date().optional().or(z.literal("")),
});
export type CreateQuestInput = z.infer<typeof createQuestSchema>;

export const completeQuestSchema = z.object({
  questId: z.string().uuid(),
});

export const purchaseItemSchema = z.object({
  itemId: z.string().uuid(),
});

export const questForgeGoalSchema = z.object({
  goal: z
    .string()
    .trim()
    .min(4, "Tell me a bit more about the goal.")
    .max(300, "Keep the goal under 300 characters."),
});

export const signUpSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email."),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Z]/, "Include at least one uppercase letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;
