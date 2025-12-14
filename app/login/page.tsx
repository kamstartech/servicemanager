"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Add your login logic here
    console.log("Login attempt:", { email, password });
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="flex h-screen">
      {/* Left side - Login Form */}
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
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-[#154E9E]">Sign In</h2>
          </div>

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
                href="/reset-password"
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
