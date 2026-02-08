'use client'

import Header from "@/components/Header"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Reservations() {
    const router = useRouter()
    const [reservations, setReservations] = useState<any[]>([])
    const [facilities, setFacilities] = useState<any[]>([])
    const [refreshKey, setRefreshKey] = useState(0)
    const [isModalOpen, setIsModalOpen] = useState(false)
    //新規予約
    const [newFacilityId, setNewFacilityId] = useState<number | null>(null)
    const [newStartTime, setNewStartTime] = useState('')
    const [newEndTime, setNewEndTime] = useState('')
    const [newNumPeople, setNewNumPeople] = useState(1)
    const [newPurpose, setNewPurpose] = useState('')
    const [userId, setUserId] = useState('')
    //編集
    // const [selectedReservation, setSelectedReservation] = useState<any | null>(null)
    const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null)
    const selectedReservation = reservations.find(r => r.id === selectedReservationId)
    const [editingId, setEditingId] = useState<number | null>(null)

    const [editFacilityId, setEditFacilityId] = useState<number | null>(null)
    const [editStartTime, setEditStartTime] = useState('')
    const [editEndTime, setEditEndTime] = useState('')
    const [editNumPeople, setEditNumPeople] = useState(1)
    const [editPurpose, setEditPurpose] = useState('')
    const isEditable = selectedReservation?.status === 'confirmed'   //詳細モーダル
    const [isEditClick, setIsEditClick] = useState(false)   //編集ボタンクリック

   useEffect(() => {
    //ログインチェック
    const checkSession = async () => {
        const {data: { session } } = await supabase.auth.getSession()
        if (!session){
            router.push('/')
        }else{
            //sessionからUUIDを取り出す
            setUserId(session.user.id)
        }
    }
    //予約一覧をロード
    const loadReservations = async () => {
        const { data, error } = await supabase
            .from('reservations')
            .select('*')
        if (data){
            setReservations(data)
        }
    }
    //施設一覧をロード
    const loadFacilities = async () => {
        const { data, error } = await supabase
            .from('facilities')
            .select('*')
        if (data){
            setFacilities(data)
        }
    }
    checkSession()
    loadReservations()
    loadFacilities()
   }, [refreshKey])


   //施設名を取得
   const getFacilityName = (facilityId: number | null) => {
    if (!facilityId) return '未設定'    //無駄にこの関数を呼び出すことを抑制（勉強のため記載）
    const facility = facilities.find((f) => f.id === facilityId)
    return facility ? facility.name : '未設定'
   }


   //予約処理
   const handleInsertReservations = async () => {
    const { error } = await supabase
        .from('reservations')
        .insert({
            user_id: userId,
            facility_id: newFacilityId,
            start_time: newStartTime,
            end_time: newEndTime,
            num_people: newNumPeople,
            purpose: newPurpose,
        })
        if (!error) {
            setRefreshKey(prev => prev + 1)
            setNewFacilityId(null)
            setNewStartTime('')
            setNewEndTime('')
            setNewNumPeople(1)
            setNewPurpose('')
            setIsModalOpen(false)
        }
   }


//    //詳細モーダルクリック処理
//    const handleReservationClick = (reservation) => {
//         setSelectedReservationId(reservation.id)
//         //selecttedReservationは次のレンダリングまで更新されないためreservationを参照している
//         setEditFacilityId(reservation.facility_id)
//         setEditStartTime(reservation.start_time)
//         setEditEndTime(reservation.end_time)
//         setEditNumPeople(reservation.num_people)
//         setEditPurpose(reservation.purpose)
//    }




   //更新処理
   const handleUpdateReservation = async () => {
    const { error } = await supabase
        .from('reservations')
        .update({ 
            facility_id: editFacilityId,
            start_time: editStartTime,
            end_time: editEndTime,
            num_people: editNumPeople,
            purpose: editPurpose,
        })
        .eq('id', selectedReservation.id)
        if (!error) {
            setRefreshKey(prev => prev + 1)
            setSelectedReservationId(null)
        } 
   }

   //キャンセル処理
   const handleCancelReservation = async () => {
    const { error } = await supabase
        .from('reservations')
        .update({ 
            status: 'cancelled' 
        })
        .eq('id', selectedReservation.id)
        if (!error) {
            setRefreshKey(prev => prev + 1)
            setSelectedReservationId(null)
        }
   }

   //日時をフォーマットする関数
   const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
   }

   //同じ日ならendの日にちを表示せず時間だけ表示する関数
   const formatDateTimeRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    if (start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate()){
            return (
                formatDateTime(startTime)
                + "-" +
                (end.toLocaleString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
                }))
            )
        }else{
            return(
                formatDateTime(startTime)
                + "-" +
                formatDateTime(endTime)
            )
        }
   }

   //timeをdatetime-localに変換
   const formatDateTimeLocal = (time : string) => {
        const timeLocal = new Date(time)
        return (
            (timeLocal.getFullYear())
            + '-' +
            ((timeLocal.getMonth() + 1).toString().padStart(2, '0'))
            + '-' +
            (timeLocal.getDate().toString().padStart(2, '0'))
            + 'T' +
            (timeLocal.getHours().toString().padStart(2, '0'))
            + ':' +
            (timeLocal.getMinutes().toString().padStart(2, '0'))
        )
   }

   //ステータスを日本語に直す関数
   const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string} = {
        'confirmed': '確定',
        'cancelled': 'キャンセル',
        'completed': '完了'
    }
    return statusMap[status] || status
   }

    return (
        <>
            <div>
                <Header />
            </div>
            <main className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">予約管理</h1>
                    <div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500 mr-2"
                        >
                            新規予約
                        </button>
                        <button
                            onClick={() => setIsEditClick(true)}
                            className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500 mr-2"
                        >
                            編集
                        </button>
                        <button

                            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500 mr-2"
                        >
                            削除
                        </button>
                    </div>
                </div>
                <div className="bg-white rounded shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                {isEditClick && <th className="px-4 py-3"></th>}
                                <th className="px-4 py-3 text-left">ID</th>
                                <th className="px-4 py-3 text-left">施設名</th>
                                <th className="px-4 py-3 text-left">開始日時</th>
                                <th className="px-4 py-3 text-left">終了日時</th>
                                <th className="px-4 py-3 text-left">ステータス</th>
                                <th className="px-4 py-3 text-left">利用人数</th>
                                <th className="px-4 py-3 text-left">利用目的</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isEditClick === true ? (
                                reservations.map((reservation) => (
                                    <tr 
                                     key={reservation.id}
                                     className="border-t"
                                     >
                                        <td className="px-4 py-3">
                                            <input
                                             type="radio"
                                             name="editTarget"
                                             checked={selectedReservationId === reservation.id}
                                             onChange={() => {
                                                setSelectedReservationId(reservation.id)
                                                setEditFacilityId(reservation.facility_id)
                                                setEditStartTime(formatDateTimeLocal(reservation.start_time))
                                                setEditEndTime(formatDateTimeLocal(reservation.end_time))
                                                setEditNumPeople(reservation.num_people)
                                                setEditPurpose(reservation.purpose || '')
                                             }}
                                             />
                                        </td>
                                        <td className="px-4 py-3">{reservation.id}</td>
                                        <td className="px-4 py-3">
                                            <select 
                                            value={editFacilityId}
                                            onChange={(e) => setEditFacilityId(Number(e.target.value))}
                                            disabled={!isEditable}
                                            >
                                                <option value="">選択してください</option>
                                                {facilities.map((f) => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                            type="datetime-local"
                                            value={formatDateTimeLocal(editStartTime)}
                                            onChange={(e) => setEditStartTime(e.target.value)}
                                            disabled={!isEditable}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input 
                                            type="datetime-local"
                                            value={formatDateTimeLocal(editEndTime)}
                                            onChange={(e) => setEditEndTime(e.target.value)}
                                            disabled={!isEditable}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input 
                                            type="text"
                                            value={getStatusLabel(reservation.status)}
                                            readOnly
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                            type="number"
                                            value={editNumPeople}
                                            onChange={(e) => setEditNumPeople(Number(e.target.value))}
                                            disabled={!isEditable}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                            type="text"
                                            value={editPurpose}
                                            onChange={(e) => setEditPurpose(e.target.value)}
                                            disabled={!isEditable}
                                            />
                                        </td>
                                    </tr>
                                ))
                            ):(
                                reservations.map((reservation) => (
                                    <tr 
                                     key={reservation.id}
                                     className="border-t"
                                     >
                                        <td className="px-4 py-3">{reservation.id}</td>
                                        <td className="px-4 py-3">{getFacilityName(reservation.facility_id)}</td>
                                        <td className="px-4 py-3">{formatDateTime(reservation.start_time)}</td>
                                        <td className="px-4 py-3">{formatDateTime(reservation.end_time)}</td>
                                        <td className="px-4 py-3">{getStatusLabel(reservation.status)}</td>
                                        <td className="px-4 py-3">{reservation.num_people}</td>
                                        <td className="px-4 py-3">{reservation.purpose}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {isEditClick && (
                    <>
                        <div
                            className="bg-white rounded shadow p-6"
                            >
                            {isEditable ? (
                                <>
                                    <div>
                                        <button
                                        className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500 mr-2"
                                        onClick={handleCancelReservation}
                                        >
                                            予約をキャンセル</button>
                                        <button
                                        onClick={() => (setIsEditClick(false))}
                                        className="bg-gray-300 text-white px-4 py-2 rounded hover:bg-gray-400 mr-2"
                                        >
                                            閉じる</button>
                                        <button
                                        className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500"
                                        onClick={handleUpdateReservation}
                                        >
                                            更新</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <button
                                            onClick={() => (setIsEditClick(false))}
                                            className="bg-gray-300 text-white px-4 py-2 rounded hover:bg-gray-400 mr-2"
                                            >
                                                閉じる
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
                {isModalOpen ? (
                    <>
                        <div 
                         className="fixed inset-0 bg-black/50 flex justify-center items-center"
                         onClick={() => (setIsModalOpen(false))}
                         >
                            <div
                             className="bg-white rounded shadow p-6 w-125"
                             onClick={(e) => (e.stopPropagation())}
                             >
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1">
                                        <select 
                                         value={newFacilityId}
                                         onChange={(e) => setNewFacilityId(Number(e.target.value))}
                                        >
                                            <option value="">選択してください</option>
                                            {facilities.map((f) => (
                                                <option key={f.id} value={f.id}>
                                                    {f.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            開始日時
                                        </label>
                                        <input
                                         type="datetime-local"
                                         value={newStartTime}
                                         onChange={(e) => setNewStartTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            終了日時
                                        </label>
                                        <input 
                                         type="datetime-local"
                                         value={newEndTime}
                                         onChange={(e) => setNewEndTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            利用人数
                                        </label>
                                        <input
                                         type="number"
                                         value={newNumPeople}
                                         onChange={(e) => setNewNumPeople(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            利用目的
                                        </label>
                                        <input
                                         type="text"
                                         value={newPurpose}
                                         onChange={(e) => setNewPurpose(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button
                                     onClick={() => setIsModalOpen(false)}
                                     className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500 mr-2"
                                     >
                                        キャンセル
                                    </button>
                                    <button
                                     className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500"
                                     onClick={handleInsertReservations}
                                     >
                                        予約する
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                    ):null}
            </main>
        </>
    )
}