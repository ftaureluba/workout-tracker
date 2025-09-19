"use client";
import { lusitana } from "@/app/ui/fonts";
import {
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { Button } from "../login/button";
import { useFormState, useFormStatus } from "react-dom";
import { signup } from "@/lib/actions";
import { State } from "@/lib/definitions";
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Mail, Lock, ArrowRight } from "lucide-react"


export default function SignupForm() {
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useFormState(signup, initialState);

  return (
    <Card className="w-full shadow-xl border-0 bg-card">
      <CardHeader className="space-y-4 pb-8">
        <div className="text-center">
          <CardTitle className="font-bold text-card-foreground text-4xl">Bienvenido!</CardTitle>
          <CardDescription className="text-muted-foreground mt-2 text-base">
            Crear una cuenta para continuar.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
    <form action={dispatch} className="space-y-6">
        <div className="w-full">
          <div>
            <Label
              className="text-sm font-medium text-card-foreground"
              htmlFor="name"
            >
              Name
            </Label>
            <div className="relative">
              <Input
                className="pl-10 h-12 bg-input border-border focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                id="name"
                type="text"
                name="name"
                placeholder="Enter your name"
                required
              />
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            <div id="name-error" aria-live="polite" aria-atomic="true">
              {state.errors?.name &&
                state.errors.name.map((error: string) => (
                  <p className="mt-2 text-sm text-red-500" key={error}>
                    {error}
                  </p>
                ))}
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="email" className="text-sm font-medium text-card-foreground">
              Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                className="pl-10 h-12 bg-input border-border focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                required
                name="email"
                placeholder="Enter your email address"
              />
                
              <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            <div id="email-error" aria-live="polite" aria-atomic="true">
              {state.errors?.email &&
                state.errors.email.map((error: string) => (
                  <p className="mt-2 text-sm text-red-500" key={error}>
                    {error}
                  </p>
                ))}
            </div>
          </div>
          <div className="mt-4">
            <Label
              className="text-sm font-medium text-card-foreground"
              htmlFor="password"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                className="pl-10 h-12 bg-input border-border focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                id="password"
                type="password"
                name="password"
                placeholder="Enter password"
                required
                minLength={6}
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            <div id="password-error" aria-live="polite" aria-atomic="true">
              {state.errors?.password &&
                state.errors.password.map((error: string) => (
                  <p className="mt-2 text-sm text-red-500" key={error}>
                    {error}
                  </p>
                ))}
            </div>
          </div>
        </div>
        <SignupButton />
        <div
          className="flex h-8 items-end space-x-1"
          aria-live="polite"
          aria-atomic="true"
        >
          {state.message && (
            <>
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">{state.message}</p>
            </>
          )}
        </div>
    </form>
    </CardContent>
    </Card>
  );
}

function SignupButton() {
  const { pending } = useFormStatus();

  return (
    <Button aria-disabled={pending}
    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            Crear cuenta
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
  );
}
