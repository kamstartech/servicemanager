"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important: include cookies
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Successful login - wait a moment for cookie to be set
        console.log("Login successful, redirecting to:", redirect);
        
        // Small delay to ensure cookie is set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force full page reload to re-run middleware
        window.location.href = redirect;
      } else {
        setError(data.error || "Login failed. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left side - Login Form */}
      <div className="w-full md:w-1/2 bg-white p-6 flex flex-col overflow-y-auto">
        <div className="flex items-center mb-8">
          <Image
            src="/images/logo/BLUE PNG/FDH LOGO-06.png"
            alt="FDH Bank"
            width={64}
            height={64}
            className="mr-4"
          />
          <h1 className="text-2xl font-bold text-[#154E9E]">FDH Bank</h1>
        </div>

        <div className="mx-auto max-w-sm flex-1 flex flex-col justify-center">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-[#154E9E]">Sign In</h2>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#154E9E] focus:border-transparent transition"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#154E9E] focus:border-transparent transition"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-[#154E9E] hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#f59e0b] text-white rounded-full py-3 px-4 hover:bg-[#d97706] transition duration-300 font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Logging in..." : "Log in →"}
            </button>
          </form>
        </div>
      </div>

      {/* Right side - Background Image - Hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-white px-12">
            <h1 className="text-4xl font-light mb-2">Welcome to</h1>
            <h1 className="text-5xl font-bold mb-1">FDH Bank</h1>
            <h1 className="text-5xl font-bold">Admin Panel</h1>
          </div>
        </div>

        <div className="absolute inset-0 bg-[#154E9E] bg-opacity-70"></div>
        <Image
          src="/images/backgrounds/login.jpg"
          alt="FDH Bank Building"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
