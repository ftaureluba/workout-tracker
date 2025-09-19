"use client";
import {
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "./button";
import { useFormStatus } from "react-dom";
import { useState } from "react"
import { signIn } from "next-auth/react";
import { verifyCredentials } from "@/lib/actions"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Mail, Lock, ArrowRight } from "lucide-react"


export default function LoginForm() {
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await verifyCredentials(email, password);
    
    if (result.success) {
      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard"
      });
    } else {
      setError(result.message || "An error ocurred.");
    }
    
  }

  return (
    <Card className="w-full shadow-xl border-0 bg-card">
      <CardHeader className="space-y-4 pb-8">
        <div className="text-center">
          <CardTitle className="font-bold text-card-foreground text-4xl">Bienvenido!</CardTitle>
          <CardDescription className="text-muted-foreground mt-2 text-base">
            Inicia sesion para continuar
          </CardDescription>
        </div>
      </CardHeader>


      <CardContent className="space-y-6">
        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-card-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="email"
                type="email"
                name="email"
                className="pl-10 h-12 bg-input border-border focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-card-foreground">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="password"
                name="password"
                className="pl-10 pr-10 h-12 bg-input border-border focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded border-border text-primary focus:ring-ring focus:ring-2" />
              <span className="text-muted-foreground">Recordarme</span>
            </label>
            <a href="#" className="text-primary hover:text-primary/80 font-medium transition-colors">
             Olvidaste la contraseña?
            </a>
          </div>
                
            <LoginButton />
            <div
              className="flex h-8 items-end space-x-1"
              aria-live="polite"
              aria-atomic="true"
            >
              {error && (
                <>
                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    <p className="text-sm text-red-500">{error || "An error ocurred."}</p>
                  </>
              )}
            </div>
        </form>
      </CardContent>
    </Card>
  );
}

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button aria-disabled={pending}
    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            Iniciar sesion
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
  );
}
