import { ReactNode } from "react";

type KartuProps = {
  children: ReactNode;
};

export function Kartu({ children }: KartuProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}
