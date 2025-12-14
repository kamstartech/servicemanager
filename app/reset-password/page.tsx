"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        toast.error(data.error || "Failed to reset password. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left side - Reset Password Form */}
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
          <div className="text-center mb-6">
            <h2 className="text-4xl font-bold text-[#154E9E] mb-3">
              Reset Password
            </h2>
            <p className="text-gray-600">Enter your new password below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password
              </label>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#154E9E] focus:border-transparent transition"
                placeholder="Enter new password"
                disabled={isLoading || !token}
                minLength={8}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#154E9E] focus:border-transparent transition"
                placeholder="Confirm new password"
                disabled={isLoading || !token}
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full bg-[#f59e0b] text-white rounded-full py-3 px-4 hover:bg-[#d97706] transition duration-300 font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm font-semibold text-[#154E9E] hover:underline"
              >
                ← Back to Login
              </Link>
            </div>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
