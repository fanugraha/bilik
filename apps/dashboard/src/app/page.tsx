import { redirect } from "next/navigation";

// Halaman awal hanya mengarahkan: middleware mengirim guru yang belum login ke /login
export default function Home() {
  redirect("/dashboard");
}
