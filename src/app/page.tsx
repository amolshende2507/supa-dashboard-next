"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("profiles").select("*");

      if (error) {
        console.error("❌ Error fetching profiles:", error.message);
      } else {
        console.log("✅ Profiles:", data);
        setProfiles(data || []);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Profiles from Supabase</h1>
      {loading && <p>Loading...</p>}
      <ul className="mt-4">
        {profiles.map((profile) => (
          <li key={profile.id} className="border-b py-2">
            <span className="font-semibold">{profile.username}</span> -{" "}
            {profile.full_name}
          </li>
        ))}
      </ul>
    </main>
  );
}
