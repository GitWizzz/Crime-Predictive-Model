"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { Divider } from "./Divider";
import { login, signup } from "@/services/auth";

type Role = "OFFICER" | "ADMIN" | "ANALYST";

export function SignupForm({ onSwitch }: { onSwitch?: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("OFFICER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const handleSwitch = () => {
    if (onSwitch) {
      onSwitch();
      return;
    }
    router.push("/login");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !email || !password) {
      setError("Name, email, and password are required.");
      return;
    }

    setLoading(true);
    try {
      await signup({ name, email, password, role });
      const result = await login({ email, password });
      const token = result?.data?.token;
      const user = result?.data?.user;

      if (!token) {
        throw new Error("Account created, but login token was not returned.");
      }

      window.localStorage.setItem("authToken", token);
      if (user) {
        window.localStorage.setItem("authUser", JSON.stringify(user));
      }

      setSuccess("Account created. Opening your role-based dashboard...");
      setName("");
      setEmail("");
      setPassword("");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Create an account</h2>
        <p className="text-sm text-zinc-400">
          Enter your details to get started
        </p>
      </div>

      <SocialAuthButtons />
      <Divider />

      <div className="space-y-2">
        <Label>Full name*</Label>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter your full name"
          className="bg-zinc-900 border-zinc-800"
        />
      </div>

      <div className="space-y-2">
        <Label>Email address*</Label>
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="Enter your email address"
          className="bg-zinc-900 border-zinc-800"
        />
      </div>

      <div className="space-y-2">
        <Label>Password*</Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="bg-zinc-900 border-zinc-800 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Role*</Label>
        <Select value={role} onValueChange={(value) => setRole(value as Role)}>
          <SelectTrigger className="w-full border-zinc-800 bg-zinc-900 text-zinc-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            position="popper"
            sideOffset={8}
            className="z-[9999] border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl"
          >
            <SelectItem value="OFFICER" className="text-zinc-100 focus:bg-emerald-500/15 focus:text-emerald-200">
              Officer
            </SelectItem>
            <SelectItem value="ADMIN" className="text-zinc-100 focus:bg-emerald-500/15 focus:text-emerald-200">
              Admin
            </SelectItem>
            <SelectItem value="ANALYST" className="text-zinc-100 focus:bg-emerald-500/15 focus:text-emerald-200">
              Analyst
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2 text-sm">
        <Checkbox id="terms" />
        <Label htmlFor="terms" className="text-zinc-400">
          I agree to the Terms & Conditions*
        </Label>
      </div>

      <Button
        className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
        disabled={loading}
      >
        {loading ? "Creating..." : "Create your account"}
      </Button>

      {error && (
        <div className="rounded border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {success}
        </div>
      )}

      <p className="text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <button type="button" onClick={handleSwitch} className="text-zinc-100 hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}
