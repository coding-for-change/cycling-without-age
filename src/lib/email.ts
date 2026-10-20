import { z } from "zod";

const email = z.email();

export const isEmail = (value: string) => email.safeParse(value.trim()).success;
