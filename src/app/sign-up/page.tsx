"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { IntroLoader } from "@/components/IntroLoader";
import SignPage from "@/components/SignPage";
import { Toaster } from "sonner";
import { useAuthContext } from "@/context/AuthContext";

export default function SignUpPage() {
  const [showIntro, setShowIntro] = useState(true);
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <>
      <AnimatePresence mode="wait">
        {showIntro ? (
          <IntroLoader key="loader" onComplete={() => setShowIntro(false)} />
        ) : (
          <SignPage key="main" />
        )}
      </AnimatePresence>
      <Toaster position="top-center" theme="dark" />
    </>
  );
}
