
import { ReactNode } from "react"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1">{children}</main>
            </div>
        </>
    )
}