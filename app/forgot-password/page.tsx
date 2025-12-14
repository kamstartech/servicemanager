"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(
          "If an account exists with this email, you will receive a password reset link shortly."
        );
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "An error occurred. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left side - Forgot Password Form */}
      <div className="w-1/2 bg-white p-6 flex flex-col">
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
              Forgot Password?
            </h2>
            <p className="text-gray-600">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>
          </div>

          {status === "success" && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{message}</p>
            </div>
          )}

          {status === "error" && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#154E9E] focus:border-transparent transition"
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#f59e0b] text-white rounded-full py-3 px-4 hover:bg-[#d97706] transition duration-300 font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
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

      {/* Right side - Background Image */}
      <div className="w-1/2 relative overflow-hidden">
        <div className="absolute top-8 right-12 z-10">
          <a
            href="https://www.fdhbank.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white hover:underline"
          >
            Go to website
          </a>
        </div>

        <div className="h-full flex flex-col justify-center items-center p-12 z-10 relative">
          <div className="text-center text-white">
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
