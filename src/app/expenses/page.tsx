"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Expense = {
  id: string;
  user_id?: string;
  amount: number;
  currency: string;
  category?: string | null;
  description?: string | null;
  date: string;
};

export default function ExpensesPage() {
  const router = useRouter();

  // auth / UI states
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // expenses data
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // form state
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  // --- initialize session & fetch data ---
  useEffect(() => {
    let mounted = true;

    async function init() {
      setCheckingAuth(true);
      // get session from Supabase client (client-side)
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("getSession error:", error);
      }

      // if no session, redirect to /auth (client-side)
      if (!session?.user) {
        router.replace("/auth");
        return;
      }

      if (!mounted) return;
      setUser(session.user);
      setCheckingAuth(false);

      // optional: subscribe to auth changes so we handle sign-outs
      const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!newSession?.user) {
          // signed out -> redirect to auth
          router.replace("/auth");
        } else {
          setUser(newSession.user);
        }
      });

      // fetch expenses for this user
      await fetchExpenses();

      // cleanup
      return () => {
        mounted = false;
        if (listener && typeof listener.subscription?.unsubscribe === "function") {
          listener.subscription.unsubscribe();
        }
      };
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- fetch expenses ---
  const fetchExpenses = async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from<Expense>("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("fetchExpenses error:", error);
      setErrorMsg(error.message);
      setExpenses([]);
    } else {
      setExpenses(data ?? []);
    }

    setLoading(false);
  };

  // --- add expense (include user_id to satisfy RLS with_check) ---
  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user) {
      router.replace("/auth");
      return;
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setErrorMsg("Enter a valid positive amount.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("expenses").insert([
      {
        user_id: user.id,                 // IMPORTANT: must include user_id due to RLS policy
        amount: amt,
        currency,
        category: category || null,
        description: description || null,
        date: new Date().toISOString(),
      },
    ]);

    setLoading(false);

    if (error) {
      console.error("insert expense error:", error);
      setErrorMsg(error.message);
      return;
    }

    // success: clear form and refresh
    setAmount("");
    setCategory("");
    setDescription("");
    await fetchExpenses();
  };

  // --- logout ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  if (checkingAuth) {
    return (
      <main className="p-6">
        <p>Checking authentication…</p>
      </main>
    );
  }
  

  return (
    <main className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Expenses</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/")}
            className="px-3 py-1 border rounded"
          >
            Home
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-red-600 text-white rounded"
          >
            Logout
          </button>
        </div>
      </div>

      <form onSubmit={addExpense} className="mb-6 p-4 border rounded max-w-md">
        <div className="flex flex-col gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border px-2 py-1 rounded"
            required
          />
          <input
            type="text"
            placeholder="Currency (e.g. INR, USD)"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              {loading ? "Saving…" : "Add Expense"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAmount("");
                setCategory("");
                setDescription("");
              }}
              className="px-4 py-2 border rounded"
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      {errorMsg && <p className="text-red-600 mb-4">{errorMsg}</p>}

      <section>
        {loading ? (
          <p>Loading expenses…</p>
        ) : expenses.length === 0 ? (
          <p>No expenses yet — add your first one above.</p>
        ) : (
          <ul className="space-y-3">
            {expenses.map((exp) => (
              <li key={exp.id} className="p-3 border rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      {exp.amount} {exp.currency}
                    </div>
                    <div className="text-sm text-gray-600">
                      {exp.category ?? "—"} • {exp.description ?? ""}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(exp.date).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}



