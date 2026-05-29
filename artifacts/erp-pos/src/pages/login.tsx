import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const loginMut = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMut.mutate({ data: values }, {
      onSuccess: (data) => {
        localStorage.setItem("erp_token", data.token);
        setLocation("/");
      },
      onError: (err) => {
        console.error(err);
        form.setError("root", { message: "Invalid credentials" });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary rounded-xl mx-auto flex items-center justify-center text-primary-foreground mb-2">
            <Activity className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Volt ERP</CardTitle>
          <CardDescription>Enter your credentials to access the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <div className="text-sm text-destructive font-medium">
                  {form.formState.errors.root.message}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loginMut.isPending}>
                {loginMut.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}