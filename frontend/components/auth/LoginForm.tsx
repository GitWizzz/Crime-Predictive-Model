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
import { login } from "@/services/auth";

export function LoginForm({ onSwitch }: { onSwitch?: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const result = await login({ email, password });
      const token = result?.data?.token;
      const user = result?.data?.user;

      if (!token) {
        throw new Error("No token returned from server.");
      }

      window.localStorage.setItem("authToken", token);
      if (user) {
        window.localStorage.setItem("authUser", JSON.stringify(user));
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Welcome Back</h2>
        <p className="text-sm text-zinc-400">
          Please enter your details to sign in
        </p>
      </div>

      <SocialAuthButtons />
      <Divider />

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
        <Select defaultValue="user">
          <SelectTrigger className="bg-zinc-900 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            position="popper"
            sideOffset={8}
            className="z-[9999] bg-zinc-950 border border-zinc-800"
          >
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="officer">Officer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="analyst">Analyst</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <Checkbox id="remember" />
          <Label htmlFor="remember" className="text-zinc-400">
            Remember Me
          </Label>
        </div>
        <a href="#" className="text-zinc-100 hover:underline">
          Forgot Password?
        </a>
      </div>

      <Button
        className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in to your account"}
      </Button>

      {error && (
        <div className="rounded border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <p className="text-center text-sm text-zinc-400">
        New on our platform?{" "}
        <button type="button" onClick={handleSwitch} className="text-zinc-100 hover:underline">
          Create an account
        </button>
      </p>
    </form>
  );
}
  const handleSwitch = () => {
    if (onSwitch) {
      onSwitch();
      return;
    }
    router.push("/signup");
  };
