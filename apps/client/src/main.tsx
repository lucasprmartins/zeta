import { ThemeProvider } from "@/components/theme-provider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./app/router";
import { queryClient } from "./lib/query";
import "./styles.css";

const element = document.getElementById("root");
if (!element) throw new Error("Elemento root ausente.");
createRoot(element).render(<StrictMode><ThemeProvider><QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider></ThemeProvider></StrictMode>);
