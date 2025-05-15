
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage, 
  FormDescription 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brandGuidelinesSchema, BrandGuidelinesFormValues, defaultFormValues } from "./BrandGuidelinesSchema";

interface BrandGuidelinesFormProps {
  onSubmit: (values: BrandGuidelinesFormValues) => void;
  isLoading: boolean;
}

const BrandGuidelinesForm = ({ onSubmit, isLoading }: BrandGuidelinesFormProps) => {
  const form = useForm<BrandGuidelinesFormValues>({
    resolver: zodResolver(brandGuidelinesSchema),
    defaultValues: defaultFormValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="brandName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. AeroVista Airlines" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="brandTone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand Tone</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="playful">Playful</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                How should your brand come across to customers?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="brandVoice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand Voice (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your brand's voice in more detail"
                  className="min-h-[80px]" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Specific language patterns or words that represent your brand
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="primaryColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Color</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      className="w-12 h-9 p-1"
                      {...field}
                    />
                    <Input 
                      type="text" 
                      value={field.value} 
                      onChange={field.onChange}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="secondaryColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secondary Color</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      className="w-12 h-9 p-1"
                      {...field}
                    />
                    <Input 
                      type="text" 
                      value={field.value} 
                      onChange={field.onChange}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="sampleTagline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sample Tagline (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Fly Beyond Expectations" {...field} />
              </FormControl>
              <FormDescription>
                A phrase that captures your brand's essence
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="doNotUse"
          render={({ field }) => (
            <FormItem>
              <FormLabel>"Do Not Use" Phrases (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add phrases or terms to avoid, one per line"
                  className="min-h-[100px]" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Terms or phrases that should be avoided in your marketing
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full bg-aviation-blue hover:bg-aviation-indigo" 
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save & Continue"}
        </Button>
      </form>
    </Form>
  );
};

export default BrandGuidelinesForm;
