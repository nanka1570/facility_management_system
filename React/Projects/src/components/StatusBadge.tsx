import { RESERVATION_STATUS } from "@/lib/constants";
import { getStatusLabel } from "@/lib/utils";

export default function StatusBadge({ status }: { status: string }) {
    const color = 
        status === RESERVATION_STATUS.COMPLETED ? 'bg-green-100 text-green-700' :
        status === RESERVATION_STATUS.CANCELLED ? 'bg-red-100 text-red-700' :
        'bg-blue-100 text-blue-700'
    return (
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
            {getStatusLabel(status)}
        </span>
    )
}