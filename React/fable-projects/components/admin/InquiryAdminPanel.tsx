"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatJstDate, formatJstTime } from "@/lib/datetime";
import type {
  InquiryMessageWithSender,
  InquiryWithProfile,
} from "@/types/database";
import Loading from "@/components/ui/Loading";
import Toast from "@/components/ui/Toast";
import InquiryThread from "@/components/inquiries/InquiryThread";

// A-07 問い合わせ管理（INQ-03 全スレッド一覧 / INQ-04 返信）
// 返信は sender_type='admin' で投稿する（RLS でも admin 以外は投稿不可）
export default function InquiryAdminPanel({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [inquiries, setInquiries] = useState<InquiryWithProfile[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<InquiryMessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("inquiries")
      .select("*, profiles(display_name, email)")
      .order("updated_at", { ascending: false });
    if (fetchError) {
      setError("問い合わせの取得に失敗しました");
    } else {
      setInquiries(data ?? []);
    }
    setLoading(false);
  }, []);

  const fetchMessages = useCallback(async (inquiryId: number) => {
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("inquiry_messages")
      .select("*, profiles(display_name)")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: true });
    if (fetchError) {
      setError("メッセージの取得に失敗しました");
    } else {
      setMessages(data ?? []);
    }
    setMessagesLoading(false);
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInquiries();
  }, [fetchInquiries]);

  const selectInquiry = (id: number) => {
    setSelectedId(id);
    setMessagesLoading(true);
    fetchMessages(id);
  };

  const handleSend = async (message: string) => {
    if (selectedId === null) return;
    setSending(true);
    const supabase = createClient();
    const { error: sendError } = await supabase.from("inquiry_messages").insert({
      inquiry_id: selectedId,
      sender_id: currentUserId,
      sender_type: "admin",
      message,
    });
    setSending(false);
    if (sendError) {
      setError("返信の送信に失敗しました");
      return;
    }
    await Promise.all([fetchMessages(selectedId), fetchInquiries()]);
  };

  if (loading) return <Loading />;

  const selected = inquiries.find((i) => i.id === selectedId) ?? null;

  return (
    <div>
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <h1 className="mb-4 text-xl font-bold">問い合わせ管理</h1>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="rounded-lg bg-white shadow">
          {inquiries.map((inquiry) => (
            <button
              key={inquiry.id}
              type="button"
              onClick={() => selectInquiry(inquiry.id)}
              className={`block w-full border-b border-gray-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-gray-50 ${
                selectedId === inquiry.id ? "bg-blue-50" : ""
              }`}
            >
              <span className="block truncate font-medium">
                {inquiry.subject}
              </span>
              <span className="block truncate text-xs text-gray-500">
                {inquiry.profiles?.display_name ?? "不明"}（
                {inquiry.profiles?.email ?? "-"}）
              </span>
              <span className="text-xs text-gray-400">
                最終更新: {formatJstDate(inquiry.updated_at)}{" "}
                {formatJstTime(inquiry.updated_at)}
              </span>
            </button>
          ))}
          {inquiries.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              問い合わせはありません
            </p>
          )}
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          {selected === null ? (
            <p className="py-8 text-center text-sm text-gray-400">
              問い合わせを選択してください
            </p>
          ) : messagesLoading ? (
            <Loading />
          ) : (
            <>
              <h2 className="mb-3 border-b border-gray-100 pb-2 font-medium">
                {selected.subject}
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {selected.profiles?.display_name ?? "不明"}
                </span>
              </h2>
              <InquiryThread
                messages={messages}
                onSend={handleSend}
                sending={sending}
                viewerType="admin"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
