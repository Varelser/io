import React from "react";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-md border px-2 py-[5px] text-[10px] outline-none ${props.className || ""}`} style={{ background: "var(--tw-bg-input)", borderColor: "var(--tw-border)", color: "var(--tw-text)", ...props.style }} />;
}
