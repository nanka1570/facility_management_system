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
    const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null)
    const selectedReservation = reservations.find(r => r.id === selectedReservationId)

    const [editFacilityId, setEditFacilityId] = useState<number | null>(null)
    const [editStartTime, setEditStartTime] = useState('')
    const [editEndTime, setEditEndTime] = useState('')
    const [editNumPeople, setEditNumPeople] = useState(1)
    const [editPurpose, setEditPurpose] = useState('')
    const [isEditClick, setIsEditClick] = useState(false)   //編集ボタンクリック
    //予約キャンセル
    const [isCancelClick, setIsCancelClick] = useState(false)   //予約キャンセルボタンクリック
    const [selectedCheckboxReservationId, setSelectedCheckboxReservationId] = useState<number[]>([])
    //予約復元
    const [isRestoreClick, setIsRestoreClick] = useState(false) //予約復元ボタンクリック

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
            .order('id', { ascending: true })
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


   //新規予約
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
        .in('id', selectedCheckboxReservationId)
        if (!error) {
            setRefreshKey(prev => prev + 1)
            setSelectedCheckboxReservationId([])
        }
   }

   //復元処理
   const handleRestoreReservation = async () => {
    const { error } = await supabase
        .from('reservations')
        .update({
            status: 'confirmed'
        })
        .in('id', selectedCheckboxReservationId)
        if (!error) {
            setRefreshKey(prev => prev + 1)
            setSelectedCheckboxReservationId([])
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
                            onClick={() => setIsCancelClick(true)}
                            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500 mr-2"
                        >
                            予約キャンセル
                        </button>
                        <button
                            onClick={() => setIsRestoreClick(true)}
                            className="bg-green-400 text-white px-4 py-2 rounded hover:bg-green-500"
                        >
                            予約復元
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
                                {reservations.map((reservation) => (
                                    <tr 
                                        key={reservation.id}
                                        //ステータスが'cancelled'ならグレーアウトする
                                        className={`border-t ${(isEditClick && reservation.status === 'cancelled') || 
                                                               (isCancelClick && reservation.status === 'cancelled') ||
                                                               (isRestoreClick && reservation.status !== 'cancelled') ? 'opacity-40' : ''}`}
                                        >
                                            {/* 編集のラジオボタン */}
                                            {isEditClick &&(
                                                <>
                                                    <td className="px-4 py-3">
                                                        <input
                                                        type="radio"
                                                        name="editTarget"
                                                        checked={selectedReservationId === reservation.id}
                                                        onChange={() => {
                                                            setSelectedReservationId(reservation.id)
                                                            setEditFacilityId(reservation.facility_id)
                                                            setEditStartTime(reservation.start_time)
                                                            setEditEndTime(reservation.end_time)
                                                            setEditNumPeople(reservation.num_people)
                                                            setEditPurpose(reservation.purpose || '')
                                                        }}
                                                        disabled={reservation.status !== 'confirmed'}
                                                        />
                                                    </td>
                                                </>
                                            )}

                                            {/* 予約キャンセルのチェックボックス */}
                                            {(isCancelClick) && (
                                                <>
                                                    <td>
                                                        <input
                                                        type="checkbox"
                                                        checked={selectedCheckboxReservationId.includes(reservation.id)}
                                                        onChange={() => {
                                                            if (selectedCheckboxReservationId.includes(reservation.id)) {
                                                                setSelectedCheckboxReservationId(
                                                                    selectedCheckboxReservationId.filter((id) => id !== reservation.id)
                                                                )
                                                            } else {
                                                                setSelectedCheckboxReservationId(
                                                                    [...selectedCheckboxReservationId, reservation.id]
                                                                )
                                                            }
                                                        }}
                                                        disabled={reservation.status !== 'confirmed'}
                                                        />
                                                    </td>
                                                </>
                                            )}

                                            {/* 予約復元のチェックボックス */}
                                            {(isRestoreClick) && (
                                                <>
                                                    <td>
                                                        <input
                                                        type="checkbox"
                                                        checked={selectedCheckboxReservationId.includes(reservation.id)}
                                                        onChange={() => {
                                                            if (selectedCheckboxReservationId.includes(reservation.id)) {
                                                                setSelectedCheckboxReservationId(
                                                                    selectedCheckboxReservationId.filter((id) => id !== reservation.id)
                                                                )
                                                            } else {
                                                                setSelectedCheckboxReservationId(
                                                                    [...selectedCheckboxReservationId, reservation.id]
                                                                )
                                                            }
                                                        }}
                                                        disabled={reservation.status !== 'cancelled'}
                                                        />
                                                    </td>
                                                </>
                                            )}
    
                                                    <td className="px-4 py-3">{reservation.id}</td>
                                                    
                                                    {/* ステータスが'cancelled'以外 かつ ラジオボタンが押されたとき */}
                                                    {reservation.status !== 'cancelled' &&  selectedReservationId === reservation.id ? (
                                                        <>
                                                            <td className="px-4 py-3">
                                                                <select 
                                                                value={editFacilityId}
                                                                onChange={(e) => setEditFacilityId(Number(e.target.value))}
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
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input 
                                                                type="datetime-local"
                                                                value={formatDateTimeLocal(editEndTime)}
                                                                onChange={(e) => setEditEndTime(e.target.value)}
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
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                type="text"
                                                                value={editPurpose}
                                                                onChange={(e) => setEditPurpose(e.target.value)}
                                                                />
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* 予約一覧 */}
                                                            <td className="px-4 py-3">{getFacilityName(reservation.facility_id)}</td>
                                                            <td className="px-4 py-3">{formatDateTime(reservation.start_time)}</td>
                                                            <td className="px-4 py-3">{formatDateTime(reservation.end_time)}</td>
                                                            <td className="px-4 py-3">{getStatusLabel(reservation.status)}</td>
                                                            <td className="px-4 py-3">{reservation.num_people}</td>
                                                            <td className="px-4 py-3">{reservation.purpose}</td>
                                                        </>
                                                    )}

                                            
                                    </tr>                                        
                                ))}
                        </tbody>
                    </table>
                </div>
                {/* 新規登録モーダル */}
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

                {/* 予約編集 */}
                {isEditClick && (
                    <>
                        <div
                            className="bg-white rounded shadow p-6"
                            >
                                <>
                                    <div>
                                        <button
                                        onClick={() => {
                                            setIsEditClick(false)
                                            setSelectedReservationId(null)   
                                        }}
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
                        </div>
                    </>
                )}

                {/* 予約キャンセル */}
                {isCancelClick && (
                    <>
                        <div>
                            <button
                            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500 mr-2"
                            onClick={handleCancelReservation}
                            >
                                予約をキャンセル
                            </button>
                            <button
                            onClick={() => {
                                setIsCancelClick(false)
                                setSelectedCheckboxReservationId([])   
                            }}
                            className="bg-gray-300 text-white px-4 py-2 rounded hover:bg-gray-400 mr-2"
                            >
                                閉じる
                            </button>
                        </div>
                    </>
                )}

                {/* 予約復元 */}
                {isRestoreClick && (
                    <>
                        <div>
                            <button
                            onClick={() => {
                                setIsRestoreClick(false)
                                setSelectedCheckboxReservationId([])   
                            }}
                            className="bg-gray-300 text-white px-4 py-2 rounded hover:bg-gray-400 mr-2"
                            >
                                閉じる
                            </button>
                            <button
                            className="bg-green-400 text-white px-4 py-2 rounded hover:bg-green-500 mr-2"
                            onClick={handleRestoreReservation}
                            >
                                予約を復元
                            </button>
                        </div>
                    </>
                )}
            </main>
        </>
    )
}