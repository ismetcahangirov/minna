"use client";

import { setupListeners } from "@reduxjs/toolkit/query";
import { useEffect, useState } from "react";
import { Provider } from "react-redux";

import { makeStore } from "@/store/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Lazy state init: one store per component instance (per request on the
  // server, once on the client) without touching refs during render.
  const [store] = useState(makeStore);

  useEffect(() => {
    // Enables refetchOnFocus / refetchOnReconnect for RTK Query.
    return setupListeners(store.dispatch);
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
