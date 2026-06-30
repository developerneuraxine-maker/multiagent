"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Business } from "@/types/database";

async function loadBusiness(): Promise<{ business: Business | null; error: string | null }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { business: null, error: null };
    }

    const { data, error: fetchError } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;
    return { business: data, error: null };
  } catch (err) {
    return {
      business: null,
      error: err instanceof Error ? err.message : "Failed to load business",
    };
  }
}

export function useBusiness() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const result = await loadBusiness();
      if (!active) return;
      setBusiness(result.business);
      setError(result.error);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await loadBusiness();
    setBusiness(result.business);
    setError(result.error);
    setLoading(false);
  }, []);

  return { business, loading, error, refetch };
}
