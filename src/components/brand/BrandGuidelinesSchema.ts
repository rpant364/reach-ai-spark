
import { z } from "zod";

export const brandGuidelinesSchema = z.object({
  brandName: z.string().min(2, { message: "Brand name must be at least 2 characters" }),
  brandTone: z.string().min(1, { message: "Please select a brand tone" }),
  brandVoice: z.string().optional(),
  primaryColor: z.string().min(1, { message: "Please select a primary color" }),
  secondaryColor: z.string().min(1, { message: "Please select a secondary color" }),
  sampleTagline: z.string().optional(),
  doNotUse: z.string().optional(),
});

export type BrandGuidelinesFormValues = z.infer<typeof brandGuidelinesSchema>;

export const defaultFormValues: BrandGuidelinesFormValues = {
  brandName: "",
  brandTone: "",
  brandVoice: "",
  primaryColor: "#0EA5E9",
  secondaryColor: "#6E59A5",
  sampleTagline: "",
  doNotUse: "",
};
